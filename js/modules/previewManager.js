// Preview Manager Module
// Handles multi-page preview with navigation, zoom, and thumbnails

const PreviewManager = {
    currentPage: 1,
    totalPages: 0,
    zoomLevel: 'fit-width', // 'fit-width', 'fit-height', '100', '150', '200'
    pdfDoc: null,
    canvases: [],
    
    /**
     * Initialize preview with PDF document
     */
    async init(pdfDoc) {
        Utils.debug.log('PreviewManager.init() called', { pages: pdfDoc.numPages });
        
        this.pdfDoc = pdfDoc;
        this.totalPages = pdfDoc.numPages;
        this.currentPage = 1;
        this.canvases = [];
        
        // Show preview section
        document.getElementById('previewSection').style.display = 'block';
        
        // Initialize UI
        this.initUI();
        
        // Render first page
        await this.renderPage(1);
        
        // Generate thumbnails in background
        this.generateThumbnails();
        
        Utils.debug.success('Preview initialized', { totalPages: this.totalPages });
    },
    
    /**
     * Initialize preview UI elements
     */
    initUI() {
        const container = document.getElementById('previewContainer');
        
        container.innerHTML = `
            <div class="preview-controls">
                <div class="preview-nav">
                    <button id="prevPageBtn" class="btn btn-icon" title="Previous Page (←)">
                        <span>←</span>
                    </button>
                    <div class="page-info">
                        <span>Page</span>
                        <input type="number" id="pageInput" min="1" max="${this.totalPages}" value="1" />
                        <span>of ${this.totalPages}</span>
                    </div>
                    <button id="nextPageBtn" class="btn btn-icon" title="Next Page (→)">
                        <span>→</span>
                    </button>
                </div>
                
                <div class="zoom-controls">
                    <button id="zoomOutBtn" class="btn btn-icon" title="Zoom Out (-)">−</button>
                    <select id="zoomSelect" class="zoom-select">
                        <option value="fit-width" selected>Fit Width</option>
                        <option value="fit-height">Fit Height</option>
                        <option value="100">100%</option>
                        <option value="150">150%</option>
                        <option value="200">200%</option>
                    </select>
                    <button id="zoomInBtn" class="btn btn-icon" title="Zoom In (+)">+</button>
                </div>
            </div>
            
            <div class="preview-main">
                <canvas id="previewCanvas"></canvas>
            </div>
            
            <div class="preview-thumbnails" id="thumbnailContainer">
                <!-- Thumbnails will be generated here -->
            </div>
        `;
        
        // Attach event listeners
        this.attachEventListeners();
    },
    
    /**
     * Attach event listeners to preview controls
     */
    attachEventListeners() {
        // Navigation buttons
        document.getElementById('prevPageBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextPageBtn').addEventListener('click', () => this.nextPage());
        
        // Page input
        document.getElementById('pageInput').addEventListener('change', (e) => {
            const page = parseInt(e.target.value);
            if (page >= 1 && page <= this.totalPages) {
                this.goToPage(page);
            }
        });
        
        // Zoom controls
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomSelect').addEventListener('change', (e) => {
            this.setZoom(e.target.value);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    },
    
    /**
     * Render a specific page
     */
    async renderPage(pageNum) {
        if (!this.pdfDoc || pageNum < 1 || pageNum > this.totalPages) return;
        
        Utils.debug.log(`Rendering page ${pageNum}/${this.totalPages}`);
        
        try {
            const page = await this.pdfDoc.getPage(pageNum);
            const canvas = document.getElementById('previewCanvas');
            const context = canvas.getContext('2d');
            
            // Calculate scale based on zoom level
            const viewport = page.getViewport({ scale: 1.0 });
            const scale = this.calculateScale(viewport);
            const scaledViewport = page.getViewport({ scale: scale });
            
            // Set canvas dimensions
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            
            // Render page
            await page.render({
                canvasContext: context,
                viewport: scaledViewport
            }).promise;
            
            this.currentPage = pageNum;
            this.updateUI();
            
            Utils.debug.success(`Page ${pageNum} rendered`);
        } catch (error) {
            Utils.debug.error(`Failed to render page ${pageNum}`, error);
        }
    },
    
    /**
     * Calculate scale based on zoom level
     */
    calculateScale(viewport) {
        const container = document.querySelector('.preview-main');
        const containerWidth = container.clientWidth - 40; // padding
        const containerHeight = container.clientHeight - 40;
        
        switch (this.zoomLevel) {
            case 'fit-width':
                return containerWidth / viewport.width;
            case 'fit-height':
                return containerHeight / viewport.height;
            case '100':
                return 1.0;
            case '150':
                return 1.5;
            case '200':
                return 2.0;
            default:
                return parseFloat(this.zoomLevel) / 100 || 1.0;
        }
    },
    
    /**
     * Generate thumbnails for all pages
     */
    async generateThumbnails() {
        const container = document.getElementById('thumbnailContainer');
        container.innerHTML = '<div class="thumbnails-loading">Generating thumbnails...</div>';
        
        const thumbnails = [];
        
        for (let i = 1; i <= this.totalPages; i++) {
            try {
                const page = await this.pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 0.2 }); // Small scale for thumbnails
                
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const context = canvas.getContext('2d');
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                const thumbnailDiv = document.createElement('div');
                thumbnailDiv.className = 'thumbnail';
                if (i === this.currentPage) {
                    thumbnailDiv.classList.add('active');
                }
                thumbnailDiv.dataset.page = i;
                thumbnailDiv.innerHTML = `
                    ${canvas.outerHTML}
                    <div class="thumbnail-label">Page ${i}</div>
                `;
                
                thumbnailDiv.addEventListener('click', () => this.goToPage(i));
                thumbnails.push(thumbnailDiv);
                
            } catch (error) {
                Utils.debug.error(`Failed to generate thumbnail for page ${i}`, error);
            }
        }
        
        container.innerHTML = '';
        thumbnails.forEach(thumb => container.appendChild(thumb));
        
        Utils.debug.success('Thumbnails generated', { count: thumbnails.length });
    },
    
    /**
     * Navigation methods
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    },
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    },
    
    goToPage(pageNum) {
        if (pageNum >= 1 && pageNum <= this.totalPages) {
            this.renderPage(pageNum);
        }
    },
    
    /**
     * Zoom methods
     */
    zoomIn() {
        const zoomLevels = ['fit-width', 'fit-height', '100', '150', '200'];
        const currentIndex = zoomLevels.indexOf(this.zoomLevel);
        if (currentIndex < zoomLevels.length - 1) {
            this.setZoom(zoomLevels[currentIndex + 1]);
        }
    },
    
    zoomOut() {
        const zoomLevels = ['fit-width', 'fit-height', '100', '150', '200'];
        const currentIndex = zoomLevels.indexOf(this.zoomLevel);
        if (currentIndex > 0) {
            this.setZoom(zoomLevels[currentIndex - 1]);
        }
    },
    
    setZoom(level) {
        this.zoomLevel = level;
        document.getElementById('zoomSelect').value = level;
        this.renderPage(this.currentPage);
    },
    
    /**
     * Update UI elements
     */
    updateUI() {
        // Update page input
        document.getElementById('pageInput').value = this.currentPage;
        
        // Update navigation buttons
        document.getElementById('prevPageBtn').disabled = this.currentPage === 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage === this.totalPages;
        
        // Update active thumbnail
        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.classList.toggle('active', parseInt(thumb.dataset.page) === this.currentPage);
        });
    },
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        // Only handle if preview is visible
        if (document.getElementById('previewSection').style.display !== 'block') return;
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.previousPage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextPage();
                break;
            case '+':
            case '=':
                e.preventDefault();
                this.zoomIn();
                break;
            case '-':
            case '_':
                e.preventDefault();
                this.zoomOut();
                break;
        }
    },
    
    /**
     * Clean up resources
     */
    cleanup() {
        this.pdfDoc = null;
        this.canvases = [];
        this.currentPage = 1;
        this.totalPages = 0;
    }
};
