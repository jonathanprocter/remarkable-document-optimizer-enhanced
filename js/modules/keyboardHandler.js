// Keyboard Handler Module
// Comprehensive keyboard shortcuts and accessibility features

const KeyboardHandler = {
    shortcuts: {},
    enabled: true,
    
    /**
     * Initialize keyboard handler
     */
    init() {
        Utils.debug.log('KeyboardHandler.init() called');
        this.registerShortcuts();
        this.attachEventListeners();
        this.initAccessibilityFeatures();
    },
    
    /**
     * Register all keyboard shortcuts
     */
    registerShortcuts() {
        this.shortcuts = {
            // File operations
            'Ctrl+O': {
                description: 'Open file',
                action: () => document.getElementById('fileInput')?.click()
            },
            'Ctrl+P': {
                description: 'Process document',
                action: () => document.getElementById('processBtn')?.click()
            },
            'Ctrl+S': {
                description: 'Download result',
                action: () => document.getElementById('downloadBtn')?.click()
            },
            'Ctrl+E': {
                description: 'Export as EPUB',
                action: () => document.getElementById('exportEpubBtn')?.click()
            },
            
            // Navigation
            'ArrowLeft': {
                description: 'Previous page (in preview)',
                action: () => PreviewManager?.previousPage()
            },
            'ArrowRight': {
                description: 'Next page (in preview)',
                action: () => PreviewManager?.nextPage()
            },
            'Home': {
                description: 'First page',
                action: () => PreviewManager?.goToPage(1)
            },
            'End': {
                description: 'Last page',
                action: () => PreviewManager?.goToPage(PreviewManager.totalPages)
            },
            
            // Zoom
            '+': {
                description: 'Zoom in',
                action: () => PreviewManager?.zoomIn()
            },
            '=': {
                description: 'Zoom in (alternate)',
                action: () => PreviewManager?.zoomIn()
            },
            '-': {
                description: 'Zoom out',
                action: () => PreviewManager?.zoomOut()
            },
            '_': {
                description: 'Zoom out (alternate)',
                action: () => PreviewManager?.zoomOut()
            },
            '0': {
                description: 'Reset zoom',
                action: () => PreviewManager?.setZoom('fit-width')
            },
            
            // UI
            'Escape': {
                description: 'Close/Cancel',
                action: () => this.handleEscape()
            },
            'Ctrl+H': {
                description: 'Toggle history',
                action: () => this.toggleHistory()
            },
            'Ctrl+K': {
                description: 'Show keyboard shortcuts',
                action: () => this.showShortcutsHelp()
            },
            'Ctrl+D': {
                description: 'Toggle debug console',
                action: () => this.toggleDebug()
            },
            
            // Accessibility
            'Alt+1': {
                description: 'Jump to upload section',
                action: () => this.jumpToSection('uploadSection')
            },
            'Alt+2': {
                description: 'Jump to options section',
                action: () => this.jumpToSection('optionsSection')
            },
            'Alt+3': {
                description: 'Jump to preview section',
                action: () => this.jumpToSection('previewSection')
            },
            'Alt+C': {
                description: 'Toggle high contrast mode',
                action: () => this.toggleHighContrast()
            }
        };
        
        Utils.debug.log('Keyboard shortcuts registered', { count: Object.keys(this.shortcuts).length });
    },
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    },
    
    /**
     * Handle keydown events
     */
    handleKeydown(e) {
        if (!this.enabled) return;
        
        // Build key combination string
        let key = '';
        if (e.ctrlKey) key += 'Ctrl+';
        if (e.altKey) key += 'Alt+';
        if (e.shiftKey) key += 'Shift+';
        key += e.key;
        
        // Check if shortcut exists
        const shortcut = this.shortcuts[key];
        if (shortcut) {
            // Don't prevent default for some keys
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
            }
            
            try {
                shortcut.action();
                Utils.debug.log('Keyboard shortcut executed', { key });
            } catch (error) {
                Utils.debug.error('Keyboard shortcut failed', { key, error });
            }
        }
    },
    
    /**
     * Initialize accessibility features
     */
    initAccessibilityFeatures() {
        // Add ARIA labels
        this.addARIALabels();
        
        // Add skip links
        this.addSkipLinks();
        
        // Add keyboard shortcuts help button
        this.addShortcutsButton();
        
        // Add high contrast toggle
        this.addHighContrastToggle();
        
        // Ensure focus indicators
        this.ensureFocusIndicators();
        
        Utils.debug.log('Accessibility features initialized');
    },
    
    /**
     * Add ARIA labels to interactive elements
     */
    addARIALabels() {
        const elements = {
            'uploadZone': 'Upload document area',
            'fileInput': 'Select document file',
            'processBtn': 'Process document button',
            'downloadBtn': 'Download optimized PDF button',
            'previewCanvas': 'Document preview',
            'debugSection': 'Debug console'
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element && !element.getAttribute('aria-label')) {
                element.setAttribute('aria-label', elements[id]);
            }
        });
    },
    
    /**
     * Add skip links for keyboard navigation
     */
    addSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#uploadSection" class="skip-link">Skip to upload</a>
            <a href="#optionsSection" class="skip-link">Skip to options</a>
            <a href="#previewSection" class="skip-link">Skip to preview</a>
        `;
        
        document.body.insertBefore(skipLinks, document.body.firstChild);
    },
    
    /**
     * Add keyboard shortcuts help button
     */
    addShortcutsButton() {
        const header = document.querySelector('.app-header');
        if (!header) return;
        
        const button = document.createElement('button');
        button.className = 'btn btn-icon shortcuts-btn';
        button.innerHTML = '⌨️';
        button.title = 'Keyboard Shortcuts (Ctrl+K)';
        button.setAttribute('aria-label', 'Show keyboard shortcuts');
        button.addEventListener('click', () => this.showShortcutsHelp());
        
        header.appendChild(button);
    },
    
    /**
     * Add high contrast toggle
     */
    addHighContrastToggle() {
        const header = document.querySelector('.app-header');
        if (!header) return;
        
        const button = document.createElement('button');
        button.className = 'btn btn-icon contrast-btn';
        button.id = 'contrastToggle';
        button.innerHTML = '◐';
        button.title = 'Toggle High Contrast (Alt+C)';
        button.setAttribute('aria-label', 'Toggle high contrast mode');
        button.addEventListener('click', () => this.toggleHighContrast());
        
        header.appendChild(button);
    },
    
    /**
     * Show keyboard shortcuts help dialog
     */
    showShortcutsHelp() {
        const dialog = document.createElement('div');
        dialog.className = 'shortcuts-dialog';
        dialog.innerHTML = `
            <div class="shortcuts-overlay" onclick="this.parentElement.remove()"></div>
            <div class="shortcuts-content">
                <div class="shortcuts-header">
                    <h2>Keyboard Shortcuts</h2>
                    <button class="btn btn-icon" onclick="this.closest('.shortcuts-dialog').remove()">×</button>
                </div>
                <div class="shortcuts-body">
                    ${this.renderShortcutsTable()}
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Focus first element
        dialog.querySelector('button')?.focus();
    },
    
    /**
     * Render shortcuts table
     */
    renderShortcutsTable() {
        const categories = {
            'File Operations': ['Ctrl+O', 'Ctrl+P', 'Ctrl+S', 'Ctrl+E'],
            'Navigation': ['ArrowLeft', 'ArrowRight', 'Home', 'End'],
            'Zoom': ['+', '=', '-', '_', '0'],
            'UI Controls': ['Escape', 'Ctrl+H', 'Ctrl+K', 'Ctrl+D'],
            'Accessibility': ['Alt+1', 'Alt+2', 'Alt+3', 'Alt+C']
        };
        
        let html = '';
        
        Object.keys(categories).forEach(category => {
            html += `<div class="shortcuts-category">
                <h3>${category}</h3>
                <table class="shortcuts-table">`;
            
            categories[category].forEach(key => {
                const shortcut = this.shortcuts[key];
                if (shortcut) {
                    html += `<tr>
                        <td class="shortcut-key"><kbd>${key}</kbd></td>
                        <td class="shortcut-desc">${shortcut.description}</td>
                    </tr>`;
                }
            });
            
            html += `</table></div>`;
        });
        
        return html;
    },
    
    /**
     * Toggle high contrast mode
     */
    toggleHighContrast() {
        document.body.classList.toggle('high-contrast');
        const isEnabled = document.body.classList.contains('high-contrast');
        
        // Save preference
        localStorage.setItem('highContrastMode', isEnabled);
        
        Utils.debug.log('High contrast mode toggled', { enabled: isEnabled });
        Utils.showMessage(`High contrast mode ${isEnabled ? 'enabled' : 'disabled'}`, 'info');
    },
    
    /**
     * Toggle history section
     */
    toggleHistory() {
        const historyToggle = document.querySelector('.history-toggle');
        if (historyToggle) {
            historyToggle.open = !historyToggle.open;
        }
    },
    
    /**
     * Toggle debug console
     */
    toggleDebug() {
        const debugSection = document.querySelector('#debugSection details');
        if (debugSection) {
            debugSection.open = !debugSection.open;
        }
    },
    
    /**
     * Handle Escape key
     */
    handleEscape() {
        // Close any open dialogs
        const dialog = document.querySelector('.shortcuts-dialog');
        if (dialog) {
            dialog.remove();
            return;
        }
        
        // Close any open details
        document.querySelectorAll('details[open]').forEach(details => {
            details.open = false;
        });
    },
    
    /**
     * Jump to section
     */
    jumpToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            section.focus();
        }
    },
    
    /**
     * Ensure focus indicators are visible
     */
    ensureFocusIndicators() {
        const style = document.createElement('style');
        style.textContent = `
            *:focus {
                outline: 2px solid #007bff;
                outline-offset: 2px;
            }
            
            *:focus:not(:focus-visible) {
                outline: none;
            }
            
            *:focus-visible {
                outline: 2px solid #007bff;
                outline-offset: 2px;
            }
        `;
        document.head.appendChild(style);
    },
    
    /**
     * Enable/disable keyboard shortcuts
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        Utils.debug.log('Keyboard shortcuts', { enabled });
    }
};
