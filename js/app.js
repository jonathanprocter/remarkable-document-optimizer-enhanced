// Enhanced App Controller
// Integrates all modules and manages application state

const App = {
    state: {
        currentFile: null,
        parsedDocument: null,
        optimizedPDF: null,
        isProcessing: false
    },
    
    /**
     * Initialize application
     */
    async init() {
        Utils.debug.log('App.init() called');
        
        try {
            // Initialize all modules
            await this.initializeModules();
            
            // Attach event listeners
            this.attachEventListeners();
            
            // Load saved preferences
            this.loadPreferences();
            
            Utils.debug.success('Application initialized successfully');
            
        } catch (error) {
            Utils.debug.error('Application initialization failed', error);
            Utils.showMessage('Failed to initialize application', 'error');
        }
    },
    
    /**
     * Initialize all enhanced modules
     */
    async initializeModules() {
        Utils.debug.log('Initializing modules...');
        
        // Initialize modules in order
        if (typeof PresetManager !== 'undefined') {
            PresetManager.init();
        }
        
        if (typeof BatchProcessor !== 'undefined') {
            BatchProcessor.init();
        }
        
        if (typeof OCRManager !== 'undefined') {
            OCRManager.init();
        }
        
        if (typeof HistoryManager !== 'undefined') {
            HistoryManager.init();
        }
        
        if (typeof KeyboardHandler !== 'undefined') {
            KeyboardHandler.init();
        }
        
        Utils.debug.success('All modules initialized');
    },
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // File upload
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        
        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Process button
        document.getElementById('processBtn')?.addEventListener('click', () => this.processDocument());
        
        // Export EPUB button
        document.getElementById('exportEpubBtn')?.addEventListener('click', () => this.exportEPUB());
        
        // Download button
        document.getElementById('downloadBtn')?.addEventListener('click', () => this.downloadPDF());
        
        // Back button
        document.getElementById('backBtn')?.addEventListener('click', () => this.reset());
        
        // Debug clear button
        document.getElementById('clearDebugBtn')?.addEventListener('click', () => {
            document.getElementById('debugLog').innerHTML = '';
        });
    },
    
    /**
     * Handle drag over
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
    },
    
    /**
     * Handle file drop
     */
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const batchMode = document.getElementById('batchModeToggle')?.checked;
            
            if (batchMode && files.length > 1) {
                BatchProcessor.addFiles(files);
            } else {
                this.loadFile(files[0]);
            }
        }
    },
    
    /**
     * Handle file selection
     */
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            const batchMode = document.getElementById('batchModeToggle')?.checked;
            
            if (batchMode && files.length > 1) {
                BatchProcessor.addFiles(files);
            } else {
                this.loadFile(files[0]);
            }
        }
    },
    
    /**
     * Load and display file info
     */
    async loadFile(file) {
        Utils.debug.log('Loading file', { name: file.name, size: file.size });
        
        this.state.currentFile = file;
        
        // Show file info
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = Utils.formatFileSize(file.size);
        document.getElementById('fileInfo').style.display = 'block';
        document.getElementById('optionsSection').style.display = 'block';
        
        Utils.showMessage(`File loaded: ${file.name}`, 'success');
    },
    
    /**
     * Process document
     */
    async processDocument() {
        if (!this.state.currentFile || this.state.isProcessing) return;
        
        this.state.isProcessing = true;
        
        try {
            Utils.debug.log('Starting document processing');
            
            // Show progress
            this.showProgress('Parsing document...', 0);
            
            // Parse document
            this.state.parsedDocument = await DocumentParser.parse(this.state.currentFile);
            this.updateProgress('Generating optimized PDF...', 50);
            
            // Get options
            const options = this.getOptions();
            
            // Generate PDF
            this.state.optimizedPDF = await PDFOptimizer.generatePDF(this.state.parsedDocument, options);
            this.updateProgress('Rendering preview...', 90);
            
            // Show preview
            await this.showPreview();
            
            // Hide progress
            this.hideProgress();
            
            // Add to history
            if (typeof HistoryManager !== 'undefined') {
                const thumbnail = await this.generateThumbnail();
                await HistoryManager.addToHistory(
                    this.state.currentFile.name,
                    options,
                    this.state.parsedDocument.pageCount || 1,
                    thumbnail
                );
            }
            
            // Show EPUB export button
            document.getElementById('exportEpubBtn').style.display = 'inline-block';
            
            Utils.debug.success('Document processing complete');
            Utils.showMessage('Document processed successfully!', 'success');
            
        } catch (error) {
            Utils.debug.error('Document processing failed', error);
            Utils.showMessage('Processing failed: ' + error.message, 'error');
            this.hideProgress();
        } finally {
            this.state.isProcessing = false;
        }
    },
    
    /**
     * Get options from UI
     */
    getOptions() {
        return {
            pageSize: document.getElementById('pageSize')?.value || 'remarkable',
            fontSize: document.getElementById('fontSize')?.value || '12',
            contrast: document.getElementById('contrast')?.value || 'medium',
            optimizeImages: document.getElementById('optimizeImages')?.checked ?? true,
            lineSpacing: document.getElementById('lineSpacing')?.value || '1.5',
            fontFamily: document.getElementById('fontFamily')?.value || 'serif',
            alignment: document.getElementById('alignment')?.value || 'left',
            marginTop: document.getElementById('marginTop')?.value || '10',
            marginBottom: document.getElementById('marginBottom')?.value || '10',
            marginLeft: document.getElementById('marginLeft')?.value || '10',
            marginRight: document.getElementById('marginRight')?.value || '10',
            paragraphSpacing: document.getElementById('paragraphSpacing')?.value || '6',
            imageCompression: document.getElementById('imageCompression')?.value || 'medium',
            imageProcessing: document.getElementById('imageProcessing')?.value || 'grayscale'
        };
    },
    
    /**
     * Show preview
     */
    async showPreview() {
        // Hide other sections
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('optionsSection').style.display = 'none';
        
        // Show preview section
        document.getElementById('previewSection').style.display = 'block';
        
        // Initialize preview manager if available
        if (typeof PreviewManager !== 'undefined' && this.state.optimizedPDF) {
            const pdfData = this.state.optimizedPDF.output('arraybuffer');
            const loadingTask = pdfjsLib.getDocument({ data: pdfData });
            const pdf = await loadingTask.promise;
            await PreviewManager.init(pdf);
        } else {
            // Fallback to simple preview
            await PreviewRenderer.render(this.state.optimizedPDF);
        }
    },
    
    /**
     * Generate thumbnail for history
     */
    async generateThumbnail() {
        try {
            const canvas = document.getElementById('previewCanvas');
            if (canvas && typeof HistoryManager !== 'undefined') {
                return await HistoryManager.generateThumbnail(canvas);
            }
        } catch (error) {
            Utils.debug.error('Thumbnail generation failed', error);
        }
        return null;
    },
    
    /**
     * Export as EPUB
     */
    async exportEPUB() {
        if (!this.state.parsedDocument) return;
        
        try {
            Utils.debug.log('Exporting as EPUB');
            Utils.showMessage('Generating EPUB...', 'info');
            
            const options = {
                title: this.state.currentFile.name.replace(/\.[^/.]+$/, ''),
                author: 'Unknown',
                language: 'en',
                fontSize: document.getElementById('fontSize')?.value + 'pt' || '12pt',
                fontFamily: document.getElementById('fontFamily')?.value || 'serif',
                lineHeight: document.getElementById('lineSpacing')?.value || '1.5',
                includeImages: document.getElementById('optimizeImages')?.checked ?? true,
                images: this.state.parsedDocument.images || []
            };
            
            const epubBlob = await EPUBGenerator.generateEPUB(this.state.parsedDocument, options);
            EPUBGenerator.downloadEPUB(epubBlob, this.state.currentFile.name);
            
            Utils.debug.success('EPUB export complete');
            Utils.showMessage('EPUB exported successfully!', 'success');
            
        } catch (error) {
            Utils.debug.error('EPUB export failed', error);
            Utils.showMessage('EPUB export failed: ' + error.message, 'error');
        }
    },
    
    /**
     * Download PDF
     */
    downloadPDF() {
        if (!this.state.optimizedPDF) return;
        
        const fileName = this.state.currentFile.name.replace(/\.[^/.]+$/, '') + '_optimized.pdf';
        this.state.optimizedPDF.save(fileName);
        
        Utils.debug.log('PDF downloaded', { fileName });
        Utils.showMessage('PDF downloaded successfully!', 'success');
    },
    
    /**
     * Show progress
     */
    showProgress(text, percentage) {
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('progressText').textContent = text;
        document.getElementById('progressFill').style.width = percentage + '%';
    },
    
    /**
     * Update progress
     */
    updateProgress(text, percentage) {
        document.getElementById('progressText').textContent = text;
        document.getElementById('progressFill').style.width = percentage + '%';
    },
    
    /**
     * Hide progress
     */
    hideProgress() {
        document.getElementById('progressSection').style.display = 'none';
    },
    
    /**
     * Reset application state
     */
    reset() {
        // Reset state
        this.state.currentFile = null;
        this.state.parsedDocument = null;
        this.state.optimizedPDF = null;
        
        // Reset UI
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('optionsSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('uploadSection').style.display = 'block';
        document.getElementById('fileInput').value = '';
        
        // Cleanup preview manager
        if (typeof PreviewManager !== 'undefined') {
            PreviewManager.cleanup();
        }
        
        Utils.debug.log('Application reset');
    },
    
    /**
     * Load saved preferences
     */
    loadPreferences() {
        try {
            // Load high contrast preference
            const highContrast = localStorage.getItem('highContrastMode') === 'true';
            if (highContrast) {
                document.body.classList.add('high-contrast');
            }
            
            Utils.debug.log('Preferences loaded');
        } catch (error) {
            Utils.debug.error('Failed to load preferences', error);
        }
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
