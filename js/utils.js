// Utility Functions for reMarkable Document Optimizer

const Utils = {
    /**
     * Debug logging with structured output
     */
    debug: {
        log: function(message, data = null) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `[${timestamp}] ${message}`;
            console.log(logEntry, data || '');
            this.addToDebugConsole('info', logEntry, data);
        },

        success: function(message, data = null) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `[${timestamp}] ✓ ${message}`;
            console.log('%c' + logEntry, 'color: green', data || '');
            this.addToDebugConsole('success', logEntry, data);
        },

        error: function(message, error = null) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `[${timestamp}] ✗ ${message}`;
            console.error(logEntry, error || '');
            this.addToDebugConsole('error', logEntry, error);
        },

        warn: function(message, data = null) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `[${timestamp}] ⚠ ${message}`;
            console.warn(logEntry, data || '');
            this.addToDebugConsole('warn', logEntry, data);
        },

        addToDebugConsole: function(type, message, data) {
            const debugLog = document.getElementById('debugLog');
            if (!debugLog) return;

            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            entry.textContent = message;
            
            if (data) {
                const dataSpan = document.createElement('span');
                dataSpan.style.display = 'block';
                dataSpan.style.marginLeft = '20px';
                dataSpan.textContent = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
                entry.appendChild(dataSpan);
            }

            debugLog.appendChild(entry);
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    },

    /**
     * Format file size to human readable format
     */
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Get file extension from filename
     */
    getFileExtension: function(filename) {
        return filename.split('.').pop().toLowerCase();
    },

    /**
     * Validate file type
     */
    isValidFileType: function(filename) {
        const validExtensions = ['pdf', 'docx', 'doc', 'md', 'markdown', 'csv', 'xlsx', 'xls', 'ppt', 'pptx', 'epub'];
        const ext = this.getFileExtension(filename);
        return validExtensions.includes(ext);
    },

    /**
     * Show/hide elements with fade animation
     */
    showElement: function(element, display = 'block') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.style.display = display;
            element.classList.add('fade-in');
        }
    },

    hideElement: function(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.style.display = 'none';
            element.classList.remove('fade-in');
        }
    },

    /**
     * Update progress bar
     */
    updateProgress: function(percent, text) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = percent + '%';
        }
        if (progressText && text) {
            progressText.textContent = text;
        }
    },

    /**
     * Show toast notification
     */
    showToast: function(message, type = 'info', duration = 3000) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast alert-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => container.removeChild(toast), 300);
        }, duration);
    },

    /**
     * Convert HTML string to plain text
     */
    htmlToText: function(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    },

    /**
     * Sanitize text for PDF generation - MINIMAL changes to preserve formatting
     */
    sanitizeText: function(text) {
        if (!text) return '';
        return text
            .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters EXCEPT \n (\u000A) and \r (\u000D)
            .replace(/\t/g, '    ') // Convert tabs to 4 spaces
            .replace(/\r\n/g, '\n') // Normalize Windows line endings
            .replace(/\r/g, '\n') // Normalize old Mac line endings
            .replace(/\n{4,}/g, '\n\n\n') // Limit consecutive newlines to 3 (preserve paragraph breaks)
            .replace(/[ \t]{2,}/g, ' ') // Only collapse 2+ consecutive spaces/tabs to 1 (preserve intentional spacing)
            .trim();
    },

    /**
     * Parse markdown to HTML
     */
    parseMarkdown: function(markdown) {
        if (typeof markdownit !== 'undefined') {
            const md = markdownit();
            return md.render(markdown);
        }
        // Fallback: basic markdown parsing
        return markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/\n/gim, '<br>');
    },

    /**
     * Deep clone object
     */
    deepClone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Debounce function
     */
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Check if running in development mode
     */
    isDevelopment: function() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    },

    /**
     * Get reMarkable device specifications
     */
    getRemarkableSpecs: function() {
        return {
            displaySize: 7.3, // inches
            widthMM: 107.8,  // PORTRAIT: width (narrower dimension)
            heightMM: 195.6, // PORTRAIT: height (taller dimension)
            widthPx: 954,    // PORTRAIT: width in pixels
            heightPx: 1696,  // PORTRAIT: height in pixels
            aspectRatio: 954 / 1696, // PORTRAIT aspect ratio
            dpi: 226,
            colorMode: 'eink' // E Ink Kaleido 3
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
