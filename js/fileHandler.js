// File Handler Module
// Manages file upload, validation, and drag-and-drop functionality

const FileHandler = {
    currentFile: null,

    /**
     * Initialize file upload handlers
     */
    init() {
        Utils.debug.log('FileHandler.init() called');

        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');

        if (!uploadZone || !fileInput) {
            Utils.debug.error('Upload elements not found');
            return;
        }

        // Click handler
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change handler
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        // Drag and drop handlers
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        Utils.debug.success('FileHandler initialized');
    },

    /**
     * Handle file upload
     */
    handleFile(file) {
        Utils.debug.log('handleFile() called', { 
            fileName: file.name, 
            fileType: file.type, 
            fileSize: file.size 
        });

        // Validate file
        if (!this.validateFile(file)) {
            return;
        }

        // Store current file
        this.currentFile = file;

        // Update UI
        this.updateFileInfo(file);

        // Show options section
        Utils.showElement('optionsSection');
        
        // Hide upload section or show file info
        document.getElementById('fileInfo').style.display = 'block';

        Utils.debug.success('File accepted and ready for processing');
        Utils.showToast('File loaded successfully!', 'success');
    },

    /**
     * Validate file
     */
    validateFile(file) {
        Utils.debug.log('Validating file', { fileName: file.name, fileSize: file.size });

        // Check file type
        if (!Utils.isValidFileType(file.name)) {
            const msg = 'Unsupported file format. Please upload PDF, DOCX, Markdown, CSV, Excel, PowerPoint, or EPUB files.';
            Utils.debug.error('File validation failed: unsupported format');
            Utils.showToast(msg, 'error', 5000);
            return false;
        }

        // Check file size (max 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            const msg = `File is too large (${Utils.formatFileSize(file.size)}). Maximum size is 50MB.`;
            Utils.debug.error('File validation failed: too large');
            Utils.showToast(msg, 'error', 5000);
            return false;
        }

        // Check if file is empty
        if (file.size === 0) {
            const msg = 'File is empty. Please select a valid document.';
            Utils.debug.error('File validation failed: empty file');
            Utils.showToast(msg, 'error');
            return false;
        }

        Utils.debug.success('File validation passed');
        return true;
    },

    /**
     * Update file info display
     */
    updateFileInfo(file) {
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');

        if (fileName) {
            fileName.textContent = `📄 ${file.name}`;
        }

        if (fileSize) {
            fileSize.textContent = `Size: ${Utils.formatFileSize(file.size)} | Type: ${Utils.getFileExtension(file.name).toUpperCase()}`;
        }

        Utils.debug.log('File info UI updated');
    },

    /**
     * Get current file
     */
    getCurrentFile() {
        return this.currentFile;
    },

    /**
     * Clear current file
     */
    clearFile() {
        this.currentFile = null;
        document.getElementById('fileInput').value = '';
        document.getElementById('fileInfo').style.display = 'none';
        Utils.debug.log('Current file cleared');
    },

    /**
     * Reset upload zone
     */
    reset() {
        this.clearFile();
        Utils.hideElement('optionsSection');
        Utils.hideElement('progressSection');
        Utils.hideElement('previewSection');
        Utils.showElement('uploadSection');
        Utils.debug.log('FileHandler reset');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileHandler;
}
