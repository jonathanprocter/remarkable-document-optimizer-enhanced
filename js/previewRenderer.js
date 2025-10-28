// Preview Renderer Module
// Handles rendering PDF preview on canvas

const PreviewRenderer = {
    currentPDF: null,
    currentPage: 1,

    /**
     * Render PDF preview to canvas
     */
    async renderPreview(pdfDoc) {
        Utils.debug.log('PreviewRenderer.renderPreview() called');

        this.currentPDF = pdfDoc;

        try {
            // Get PDF as blob
            const pdfBlob = await PDFOptimizer.getPDFBlob(pdfDoc);
            
            // Convert blob to array buffer
            const arrayBuffer = await pdfBlob.arrayBuffer();
            
            Utils.debug.log('Loading PDF for preview', { 
                size: arrayBuffer.byteLength 
            });

            // Load PDF with PDF.js
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            Utils.debug.success('PDF loaded for preview', { 
                numPages: pdf.numPages 
            });

            // Render first page
            await this.renderPage(pdf, 1);

            // Show preview section
            Utils.showElement('previewSection');
            Utils.hideElement('progressSection');

            Utils.debug.success('Preview rendered successfully');
        } catch (error) {
            Utils.debug.error('Preview rendering failed', error);
            Utils.showToast('Failed to generate preview. PDF may still be downloadable.', 'warning', 5000);
            
            // Still show preview section with error message
            Utils.showElement('previewSection');
            Utils.hideElement('progressSection');
            
            const previewContainer = document.getElementById('previewContainer');
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <p style="font-size: 1.2em; color: var(--danger-color);">⚠️ Preview generation failed</p>
                        <p>The PDF may still be valid. Try downloading it.</p>
                        <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 20px;">Error: ${error.message}</p>
                    </div>
                `;
            }
        }
    },

    /**
     * Render specific page of PDF
     */
    async renderPage(pdf, pageNumber) {
        Utils.debug.log('Rendering page', { pageNumber, totalPages: pdf.numPages });

        const page = await pdf.getPage(pageNumber);
        const canvas = document.getElementById('previewCanvas');
        const context = canvas.getContext('2d');

        // Calculate scale to fit canvas
        const viewport = page.getViewport({ scale: 1.0 });
        const maxWidth = 800;
        const scale = maxWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: scale });

        // Set canvas dimensions
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        Utils.debug.log('Canvas configured', { 
            width: canvas.width, 
            height: canvas.height, 
            scale: scale 
        });

        // Render page
        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };

        await page.render(renderContext).promise;

        this.currentPage = pageNumber;
        Utils.debug.success('Page rendered', { pageNumber });
    },

    /**
     * Initialize preview controls (if adding page navigation later)
     */
    initControls() {
        // Placeholder for future page navigation controls
        Utils.debug.log('Preview controls initialized');
    },

    /**
     * Get current PDF document
     */
    getCurrentPDF() {
        return this.currentPDF;
    },

    /**
     * Clear preview
     */
    clear() {
        const canvas = document.getElementById('previewCanvas');
        if (canvas) {
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
        this.currentPDF = null;
        this.currentPage = 1;
        Utils.debug.log('Preview cleared');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewRenderer;
}
