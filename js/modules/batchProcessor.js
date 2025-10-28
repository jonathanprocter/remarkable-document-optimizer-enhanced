// Batch Processor Module
// Handles multiple file uploads and processing queue

const BatchProcessor = {
    queue: [],
    processing: false,
    results: [],
    
    /**
     * Initialize batch processor
     */
    init() {
        Utils.debug.log('BatchProcessor.init() called');
        this.queue = [];
        this.results = [];
        this.processing = false;
        this.initUI();
    },
    
    /**
     * Initialize batch UI
     */
    initUI() {
        const uploadSection = document.getElementById('uploadSection');
        
        // Add batch mode toggle
        const batchToggle = document.createElement('div');
        batchToggle.className = 'batch-toggle';
        batchToggle.innerHTML = `
            <label class="toggle-label">
                <input type="checkbox" id="batchModeToggle" />
                <span>Batch Mode (Multiple Files)</span>
            </label>
        `;
        uploadSection.insertBefore(batchToggle, uploadSection.firstChild);
        
        // Update file input to accept multiple files
        document.getElementById('batchModeToggle').addEventListener('change', (e) => {
            const fileInput = document.getElementById('fileInput');
            fileInput.multiple = e.target.checked;
            this.updateUI(e.target.checked);
        });
    },
    
    /**
     * Add files to queue
     */
    addFiles(files) {
        Utils.debug.log('Adding files to batch queue', { count: files.length });
        
        for (const file of files) {
            const queueItem = {
                id: Date.now() + Math.random(),
                file: file,
                status: 'pending', // pending, processing, completed, error
                progress: 0,
                result: null,
                error: null
            };
            this.queue.push(queueItem);
        }
        
        this.renderQueue();
        Utils.debug.success('Files added to queue', { totalInQueue: this.queue.length });
    },
    
    /**
     * Render queue UI
     */
    renderQueue() {
        let queueContainer = document.getElementById('batchQueue');
        
        if (!queueContainer) {
            queueContainer = document.createElement('div');
            queueContainer.id = 'batchQueue';
            queueContainer.className = 'batch-queue';
            
            const uploadSection = document.getElementById('uploadSection');
            uploadSection.appendChild(queueContainer);
        }
        
        queueContainer.innerHTML = `
            <div class="queue-header">
                <h3>Processing Queue (${this.queue.length} files)</h3>
                <div class="queue-actions">
                    <button class="btn btn-secondary btn-small" id="clearQueueBtn">Clear All</button>
                    <button class="btn btn-primary" id="processQueueBtn" ${this.processing ? 'disabled' : ''}>
                        Process All
                    </button>
                </div>
            </div>
            <div class="queue-items">
                ${this.queue.map(item => this.renderQueueItem(item)).join('')}
            </div>
        `;
        
        // Attach event listeners
        document.getElementById('clearQueueBtn')?.addEventListener('click', () => this.clearQueue());
        document.getElementById('processQueueBtn')?.addEventListener('click', () => this.processQueue());
        
        // Attach remove buttons
        this.queue.forEach(item => {
            document.getElementById(`remove-${item.id}`)?.addEventListener('click', () => this.removeItem(item.id));
        });
    },
    
    /**
     * Render individual queue item
     */
    renderQueueItem(item) {
        const statusIcons = {
            pending: '⏳',
            processing: '⚙️',
            completed: '✓',
            error: '✗'
        };
        
        const statusColors = {
            pending: '#999',
            processing: '#007bff',
            completed: '#28a745',
            error: '#dc3545'
        };
        
        return `
            <div class="queue-item" data-id="${item.id}">
                <div class="queue-item-icon" style="color: ${statusColors[item.status]}">
                    ${statusIcons[item.status]}
                </div>
                <div class="queue-item-info">
                    <div class="queue-item-name">${item.file.name}</div>
                    <div class="queue-item-size">${Utils.formatFileSize(item.file.size)}</div>
                    ${item.status === 'processing' ? `
                        <div class="queue-item-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${item.progress}%"></div>
                            </div>
                        </div>
                    ` : ''}
                    ${item.error ? `<div class="queue-item-error">${item.error}</div>` : ''}
                </div>
                <div class="queue-item-actions">
                    ${item.status === 'completed' ? `
                        <button class="btn btn-small btn-success" onclick="BatchProcessor.downloadResult('${item.id}')">
                            Download
                        </button>
                    ` : ''}
                    ${item.status === 'pending' || item.status === 'error' ? `
                        <button class="btn btn-small btn-secondary" id="remove-${item.id}">
                            Remove
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    /**
     * Process entire queue
     */
    async processQueue() {
        if (this.processing) return;
        
        Utils.debug.log('Starting batch processing', { queueSize: this.queue.length });
        this.processing = true;
        this.renderQueue();
        
        // Get options from UI
        const options = {
            pageSize: document.getElementById('pageSize').value,
            fontSize: document.getElementById('fontSize').value,
            contrast: document.getElementById('contrast').value,
            optimizeImages: document.getElementById('optimizeImages').checked
        };
        
        for (const item of this.queue) {
            if (item.status === 'completed') continue;
            
            try {
                item.status = 'processing';
                item.progress = 0;
                this.renderQueue();
                
                // Parse document
                item.progress = 25;
                this.renderQueue();
                const parsed = await DocumentParser.parse(item.file);
                
                // Generate PDF
                item.progress = 75;
                this.renderQueue();
                const pdf = await PDFOptimizer.generatePDF(parsed, options);
                
                // Store result
                item.result = pdf;
                item.status = 'completed';
                item.progress = 100;
                this.results.push(item);
                
                Utils.debug.success(`Processed: ${item.file.name}`);
                
            } catch (error) {
                item.status = 'error';
                item.error = error.message;
                Utils.debug.error(`Failed to process: ${item.file.name}`, error);
            }
            
            this.renderQueue();
        }
        
        this.processing = false;
        this.renderQueue();
        
        // Show download all button if all completed
        const allCompleted = this.queue.every(item => item.status === 'completed');
        if (allCompleted && this.queue.length > 1) {
            this.showDownloadAllButton();
        }
        
        Utils.debug.success('Batch processing complete', { 
            total: this.queue.length,
            completed: this.results.length
        });
    },
    
    /**
     * Download individual result
     */
    downloadResult(itemId) {
        const item = this.queue.find(i => i.id == itemId);
        if (!item || !item.result) return;
        
        const fileName = item.file.name.replace(/\.[^/.]+$/, '') + '_optimized.pdf';
        item.result.save(fileName);
        
        Utils.debug.log('Downloaded result', { fileName });
    },
    
    /**
     * Download all results as ZIP
     */
    async downloadAll() {
        Utils.debug.log('Creating ZIP archive for batch download');
        
        const zip = new JSZip();
        
        for (const item of this.results) {
            if (item.result) {
                const fileName = item.file.name.replace(/\.[^/.]+$/, '') + '_optimized.pdf';
                const pdfBlob = item.result.output('blob');
                zip.file(fileName, pdfBlob);
            }
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `remarkable_optimized_${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        
        Utils.debug.success('Batch download complete');
    },
    
    /**
     * Show download all button
     */
    showDownloadAllButton() {
        const queueHeader = document.querySelector('.queue-header .queue-actions');
        if (!queueHeader) return;
        
        if (!document.getElementById('downloadAllBtn')) {
            const btn = document.createElement('button');
            btn.id = 'downloadAllBtn';
            btn.className = 'btn btn-success';
            btn.textContent = 'Download All as ZIP';
            btn.addEventListener('click', () => this.downloadAll());
            queueHeader.appendChild(btn);
        }
    },
    
    /**
     * Remove item from queue
     */
    removeItem(itemId) {
        this.queue = this.queue.filter(item => item.id !== itemId);
        this.renderQueue();
        Utils.debug.log('Item removed from queue', { itemId });
    },
    
    /**
     * Clear entire queue
     */
    clearQueue() {
        if (confirm('Are you sure you want to clear the entire queue?')) {
            this.queue = [];
            this.results = [];
            this.renderQueue();
            Utils.debug.log('Queue cleared');
        }
    },
    
    /**
     * Update UI based on batch mode
     */
    updateUI(batchMode) {
        const fileInfo = document.getElementById('fileInfo');
        const optionsSection = document.getElementById('optionsSection');
        
        if (batchMode) {
            fileInfo.style.display = 'none';
            optionsSection.style.display = 'block';
        }
    }
};
