// History Manager Module
// Manages document processing history using localStorage

const HistoryManager = {
    maxHistory: 10,
    history: [],
    
    /**
     * Initialize history manager
     */
    init() {
        Utils.debug.log('HistoryManager.init() called');
        this.loadHistory();
        this.initUI();
    },
    
    /**
     * Initialize history UI
     */
    initUI() {
        // Create history section
        const container = document.querySelector('.container main');
        
        const historySection = document.createElement('section');
        historySection.className = 'history-section';
        historySection.id = 'historySection';
        historySection.innerHTML = `
            <details class="history-toggle">
                <summary>
                    <span>📜 Recent Documents</span>
                    <span class="history-count">(${this.history.length})</span>
                </summary>
                <div class="history-container" id="historyContainer">
                    ${this.renderHistory()}
                </div>
            </details>
        `;
        
        // Insert after upload section
        const uploadSection = document.getElementById('uploadSection');
        uploadSection.after(historySection);
    },
    
    /**
     * Render history items
     */
    renderHistory() {
        if (this.history.length === 0) {
            return '<div class="history-empty">No recent documents</div>';
        }
        
        return `
            <div class="history-actions">
                <button class="btn btn-small btn-secondary" id="clearHistoryBtn">Clear All</button>
            </div>
            <div class="history-grid">
                ${this.history.map((item, index) => this.renderHistoryItem(item, index)).join('')}
            </div>
        `;
    },
    
    /**
     * Render individual history item
     */
    renderHistoryItem(item, index) {
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="history-item" data-index="${index}">
                <div class="history-thumbnail">
                    ${item.thumbnail ? `<img src="${item.thumbnail}" alt="Thumbnail" />` : '<div class="thumbnail-placeholder">📄</div>'}
                </div>
                <div class="history-info">
                    <div class="history-filename">${item.filename}</div>
                    <div class="history-meta">
                        <span class="history-date">${dateStr}</span>
                        <span class="history-pages">${item.pageCount} pages</span>
                    </div>
                    <div class="history-settings">
                        ${item.settings.fontSize}pt • ${item.settings.contrast} contrast
                        ${item.settings.preset ? ` • ${item.settings.preset}` : ''}
                    </div>
                </div>
                <div class="history-actions-item">
                    <button class="btn btn-small btn-primary" onclick="HistoryManager.reprocess(${index})">
                        Reprocess
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="HistoryManager.removeItem(${index})">
                        Remove
                    </button>
                </div>
            </div>
        `;
    },
    
    /**
     * Add document to history
     */
    async addToHistory(filename, settings, pageCount, thumbnail = null) {
        const historyItem = {
            filename: filename,
            timestamp: Date.now(),
            settings: settings,
            pageCount: pageCount,
            thumbnail: thumbnail
        };
        
        // Add to beginning of array
        this.history.unshift(historyItem);
        
        // Keep only max items
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }
        
        // Save to localStorage
        this.saveHistory();
        
        // Update UI
        this.updateUI();
        
        Utils.debug.log('Document added to history', { filename });
    },
    
    /**
     * Reprocess document from history
     */
    async reprocess(index) {
        const item = this.history[index];
        if (!item) return;
        
        Utils.debug.log('Reprocessing from history', { filename: item.filename });
        
        // Apply settings from history
        Object.keys(item.settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = item.settings[key];
                } else {
                    element.value = item.settings[key];
                }
            }
        });
        
        // Show notification
        Utils.showMessage(`Settings restored from "${item.filename}". Please upload the document to reprocess.`, 'info');
        
        // Scroll to upload section
        document.getElementById('uploadSection').scrollIntoView({ behavior: 'smooth' });
    },
    
    /**
     * Remove item from history
     */
    removeItem(index) {
        if (confirm('Remove this document from history?')) {
            this.history.splice(index, 1);
            this.saveHistory();
            this.updateUI();
            Utils.debug.log('History item removed', { index });
        }
    },
    
    /**
     * Clear all history
     */
    clearHistory() {
        if (confirm('Clear all document history?')) {
            this.history = [];
            this.saveHistory();
            this.updateUI();
            Utils.debug.log('History cleared');
        }
    },
    
    /**
     * Update history UI
     */
    updateUI() {
        const container = document.getElementById('historyContainer');
        if (container) {
            container.innerHTML = this.renderHistory();
            
            // Attach clear button listener
            document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
                this.clearHistory();
            });
        }
        
        // Update count
        const countElement = document.querySelector('.history-count');
        if (countElement) {
            countElement.textContent = `(${this.history.length})`;
        }
    },
    
    /**
     * Load history from localStorage
     */
    loadHistory() {
        try {
            const stored = localStorage.getItem('remarkableHistory');
            if (stored) {
                this.history = JSON.parse(stored);
                Utils.debug.log('History loaded', { count: this.history.length });
            }
        } catch (error) {
            Utils.debug.error('Failed to load history', error);
            this.history = [];
        }
    },
    
    /**
     * Save history to localStorage
     */
    saveHistory() {
        try {
            localStorage.setItem('remarkableHistory', JSON.stringify(this.history));
            Utils.debug.log('History saved', { count: this.history.length });
        } catch (error) {
            Utils.debug.error('Failed to save history', error);
            
            // If quota exceeded, remove oldest items
            if (error.name === 'QuotaExceededError') {
                this.history = this.history.slice(0, 5);
                this.saveHistory();
            }
        }
    },
    
    /**
     * Generate thumbnail from canvas
     */
    async generateThumbnail(canvas) {
        try {
            // Create smaller canvas for thumbnail
            const thumbCanvas = document.createElement('canvas');
            const maxSize = 200;
            const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);
            
            thumbCanvas.width = canvas.width * scale;
            thumbCanvas.height = canvas.height * scale;
            
            const ctx = thumbCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
            
            // Convert to data URL (compressed)
            return thumbCanvas.toDataURL('image/jpeg', 0.7);
        } catch (error) {
            Utils.debug.error('Failed to generate thumbnail', error);
            return null;
        }
    },
    
    /**
     * Get storage usage info
     */
    getStorageInfo() {
        try {
            const stored = localStorage.getItem('remarkableHistory');
            const bytes = stored ? new Blob([stored]).size : 0;
            const kb = (bytes / 1024).toFixed(2);
            
            return {
                items: this.history.length,
                sizeKB: kb,
                sizeBytes: bytes
            };
        } catch (error) {
            return { items: 0, sizeKB: 0, sizeBytes: 0 };
        }
    }
};
