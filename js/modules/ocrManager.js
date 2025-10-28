// OCR Manager Module
// Enhanced OCR with real-time feedback and progress tracking

const OCRManager = {
    worker: null,
    isProcessing: false,
    currentPage: 0,
    totalPages: 0,
    language: 'eng',
    quality: 'balanced', // fast, balanced, accurate
    
    /**
     * Initialize OCR manager
     */
    init() {
        Utils.debug.log('OCRManager.init() called');
        this.initUI();
    },
    
    /**
     * Initialize OCR UI controls
     */
    initUI() {
        const optionsSection = document.getElementById('optionsSection');
        
        const ocrSection = document.createElement('div');
        ocrSection.className = 'ocr-settings';
        ocrSection.innerHTML = `
            <details class="ocr-toggle">
                <summary>OCR Settings (for scanned documents)</summary>
                <div class="ocr-grid">
                    <div class="option-group">
                        <label for="ocrLanguage">Language</label>
                        <select id="ocrLanguage">
                            <option value="eng" selected>English</option>
                            <option value="spa">Spanish</option>
                            <option value="fra">French</option>
                            <option value="deu">German</option>
                            <option value="ita">Italian</option>
                            <option value="por">Portuguese</option>
                            <option value="rus">Russian</option>
                            <option value="chi_sim">Chinese (Simplified)</option>
                            <option value="jpn">Japanese</option>
                            <option value="kor">Korean</option>
                        </select>
                    </div>
                    
                    <div class="option-group">
                        <label for="ocrQuality">OCR Quality</label>
                        <select id="ocrQuality">
                            <option value="fast">Fast</option>
                            <option value="balanced" selected>Balanced</option>
                            <option value="accurate">Accurate (Slow)</option>
                        </select>
                    </div>
                    
                    <div class="option-group">
                        <label>
                            <input type="checkbox" id="ocrAutoDetect" checked />
                            Auto-detect scanned PDFs
                        </label>
                    </div>
                </div>
            </details>
        `;
        
        optionsSection.appendChild(ocrSection);
        
        // Attach event listeners
        document.getElementById('ocrLanguage')?.addEventListener('change', (e) => {
            this.language = e.target.value;
        });
        
        document.getElementById('ocrQuality')?.addEventListener('change', (e) => {
            this.quality = e.target.value;
        });
    },
    
    /**
     * Process page with OCR and visual feedback
     */
    async processPage(page, pageNum, totalPages) {
        this.currentPage = pageNum;
        this.totalPages = totalPages;
        this.isProcessing = true;
        
        Utils.debug.log(`OCR processing page ${pageNum}/${totalPages}`);
        
        // Show OCR progress UI
        this.showProgress();
        
        try {
            // Render page to canvas
            const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Update progress: rendering complete
            this.updateProgress('Analyzing page...', 30);
            
            // Convert canvas to image data
            const imageData = canvas.toDataURL('image/png');
            
            // Perform OCR
            const result = await this.performOCR(imageData);
            
            // Update progress: OCR complete
            this.updateProgress('Extracting text...', 90);
            
            Utils.debug.success(`OCR completed for page ${pageNum}`, { 
                confidence: result.confidence,
                textLength: result.text.length
            });
            
            return result.text;
            
        } catch (error) {
            Utils.debug.error(`OCR failed for page ${pageNum}`, error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    },
    
    /**
     * Perform OCR using Tesseract.js
     */
    async performOCR(imageData) {
        // Initialize worker if not already done
        if (!this.worker) {
            this.worker = await Tesseract.createWorker(this.language, 1, {
                logger: (m) => this.handleOCRProgress(m)
            });
        }
        
        // Set parameters based on quality setting
        const params = this.getQualityParams();
        await this.worker.setParameters(params);
        
        // Recognize text
        const result = await this.worker.recognize(imageData);
        
        return {
            text: result.data.text,
            confidence: result.data.confidence
        };
    },
    
    /**
     * Get OCR parameters based on quality setting
     */
    getQualityParams() {
        switch (this.quality) {
            case 'fast':
                return {
                    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                    tessedit_ocr_engine_mode: Tesseract.OEM.DEFAULT
                };
            case 'accurate':
                return {
                    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                    tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
                };
            case 'balanced':
            default:
                return {
                    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                    tessedit_ocr_engine_mode: Tesseract.OEM.DEFAULT
                };
        }
    },
    
    /**
     * Handle OCR progress updates from Tesseract
     */
    handleOCRProgress(m) {
        if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 60) + 30; // 30-90% range
            this.updateProgress(`Processing... ${Math.round(m.progress * 100)}%`, progress);
        }
    },
    
    /**
     * Show OCR progress UI
     */
    showProgress() {
        let progressContainer = document.getElementById('ocrProgress');
        
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'ocrProgress';
            progressContainer.className = 'ocr-progress-container';
            document.getElementById('progressSection').appendChild(progressContainer);
        }
        
        progressContainer.innerHTML = `
            <div class="ocr-progress-header">
                <h3>OCR Processing</h3>
                <p>Extracting text from scanned document...</p>
            </div>
            <div class="ocr-progress-visual">
                <div class="ocr-page-indicator">
                    <span class="ocr-current-page">${this.currentPage}</span>
                    <span class="ocr-separator">/</span>
                    <span class="ocr-total-pages">${this.totalPages}</span>
                </div>
                <div class="ocr-progress-bar">
                    <div class="ocr-progress-fill" id="ocrProgressFill"></div>
                </div>
                <div class="ocr-status-text" id="ocrStatusText">Initializing...</div>
            </div>
            <div class="ocr-animation">
                <div class="ocr-scanner"></div>
            </div>
        `;
        
        progressContainer.style.display = 'block';
    },
    
    /**
     * Update OCR progress
     */
    updateProgress(statusText, percentage) {
        const fillElement = document.getElementById('ocrProgressFill');
        const statusElement = document.getElementById('ocrStatusText');
        const currentPageElement = document.querySelector('.ocr-current-page');
        
        if (fillElement) {
            fillElement.style.width = `${percentage}%`;
        }
        
        if (statusElement) {
            statusElement.textContent = statusText;
        }
        
        if (currentPageElement) {
            currentPageElement.textContent = this.currentPage;
        }
    },
    
    /**
     * Hide OCR progress UI
     */
    hideProgress() {
        const progressContainer = document.getElementById('ocrProgress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    },
    
    /**
     * Terminate OCR worker
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            Utils.debug.log('OCR worker terminated');
        }
    },
    
    /**
     * Check if document needs OCR (scanned PDF detection)
     */
    isScannedPDF(extractedChars, pageCount) {
        const autoDetect = document.getElementById('ocrAutoDetect')?.checked ?? true;
        
        if (!autoDetect) return false;
        
        // Heuristic: If less than 200 characters extracted from entire document,
        // it's likely a scanned PDF
        const avgCharsPerPage = extractedChars / pageCount;
        return avgCharsPerPage < 50;
    }
};
