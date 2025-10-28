// Preset Manager Module
// Manages smart presets and custom user settings

const PresetManager = {
    presets: {
        book: {
            name: 'Book/Novel',
            description: 'Optimized for long-form reading',
            settings: {
                pageSize: 'remarkable',
                fontSize: '12',
                contrast: 'medium',
                lineSpacing: '1.5',
                fontFamily: 'serif',
                alignment: 'justify',
                marginTop: '15',
                marginBottom: '15',
                marginLeft: '12',
                marginRight: '12',
                paragraphSpacing: '8',
                optimizeImages: true,
                imageCompression: 'medium',
                imageProcessing: 'grayscale'
            }
        },
        article: {
            name: 'Article/Paper',
            description: 'Academic document formatting',
            settings: {
                pageSize: 'remarkable',
                fontSize: '11',
                contrast: 'high',
                lineSpacing: '1.15',
                fontFamily: 'serif',
                alignment: 'left',
                marginTop: '12',
                marginBottom: '12',
                marginLeft: '10',
                marginRight: '10',
                paragraphSpacing: '6',
                optimizeImages: true,
                imageCompression: 'low',
                imageProcessing: 'grayscale'
            }
        },
        technical: {
            name: 'Technical Doc',
            description: 'Code-friendly monospace',
            settings: {
                pageSize: 'remarkable',
                fontSize: '10',
                contrast: 'high',
                lineSpacing: 'single',
                fontFamily: 'monospace',
                alignment: 'left',
                marginTop: '10',
                marginBottom: '10',
                marginLeft: '8',
                marginRight: '8',
                paragraphSpacing: '4',
                optimizeImages: true,
                imageCompression: 'medium',
                imageProcessing: 'grayscale'
            }
        },
        spreadsheet: {
            name: 'Spreadsheet',
            description: 'Compact layout for data',
            settings: {
                pageSize: 'remarkable',
                fontSize: '8',
                contrast: 'high',
                lineSpacing: 'single',
                fontFamily: 'sans-serif',
                alignment: 'left',
                marginTop: '8',
                marginBottom: '8',
                marginLeft: '6',
                marginRight: '6',
                paragraphSpacing: '2',
                optimizeImages: false,
                imageCompression: 'high',
                imageProcessing: 'remove'
            }
        },
        presentation: {
            name: 'Presentation',
            description: 'Large text, high contrast',
            settings: {
                pageSize: 'remarkable',
                fontSize: '16',
                contrast: 'high',
                lineSpacing: '1.5',
                fontFamily: 'sans-serif',
                alignment: 'center',
                marginTop: '20',
                marginBottom: '20',
                marginLeft: '15',
                marginRight: '15',
                paragraphSpacing: '12',
                optimizeImages: true,
                imageCompression: 'low',
                imageProcessing: 'blackwhite'
            }
        }
    },
    
    customPresets: {},
    currentPreset: null,
    
    /**
     * Initialize preset manager
     */
    init() {
        Utils.debug.log('PresetManager.init() called');
        this.loadCustomPresets();
        this.initUI();
    },
    
    /**
     * Initialize preset UI
     */
    initUI() {
        const optionsSection = document.getElementById('optionsSection');
        
        // Create preset selector
        const presetSelector = document.createElement('div');
        presetSelector.className = 'preset-selector';
        presetSelector.innerHTML = `
            <div class="preset-header">
                <label>Quick Presets</label>
                <button class="btn btn-small btn-secondary" id="savePresetBtn">Save Custom</button>
            </div>
            <div class="preset-grid">
                ${Object.keys(this.presets).map(key => `
                    <button class="preset-card" data-preset="${key}">
                        <div class="preset-name">${this.presets[key].name}</div>
                        <div class="preset-desc">${this.presets[key].description}</div>
                    </button>
                `).join('')}
                ${Object.keys(this.customPresets).map(key => `
                    <button class="preset-card preset-custom" data-preset="custom-${key}">
                        <div class="preset-name">${this.customPresets[key].name}</div>
                        <div class="preset-desc">Custom preset</div>
                        <button class="preset-delete" data-preset="${key}">×</button>
                    </button>
                `).join('')}
            </div>
        `;
        
        // Insert at the top of options section
        optionsSection.insertBefore(presetSelector, optionsSection.firstChild);
        
        // Add advanced formatting controls
        this.addAdvancedControls(optionsSection);
        
        // Attach event listeners
        this.attachEventListeners();
    },
    
    /**
     * Add advanced formatting controls
     */
    addAdvancedControls(container) {
        const advancedSection = document.createElement('div');
        advancedSection.className = 'advanced-controls';
        advancedSection.innerHTML = `
            <details class="advanced-toggle">
                <summary>Advanced Formatting Options</summary>
                <div class="advanced-grid">
                    <div class="option-group">
                        <label for="lineSpacing">Line Spacing</label>
                        <select id="lineSpacing">
                            <option value="single">Single</option>
                            <option value="1.15">1.15</option>
                            <option value="1.5" selected>1.5</option>
                            <option value="double">Double</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    
                    <div class="option-group">
                        <label for="fontFamily">Font Family</label>
                        <select id="fontFamily">
                            <option value="serif" selected>Serif</option>
                            <option value="sans-serif">Sans-serif</option>
                            <option value="monospace">Monospace</option>
                        </select>
                    </div>
                    
                    <div class="option-group">
                        <label for="alignment">Text Alignment</label>
                        <select id="alignment">
                            <option value="left" selected>Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                            <option value="justify">Justify</option>
                        </select>
                    </div>
                    
                    <div class="option-group">
                        <label for="marginTop">Margin Top (mm)</label>
                        <input type="number" id="marginTop" min="0" max="50" value="10" />
                    </div>
                    
                    <div class="option-group">
                        <label for="marginBottom">Margin Bottom (mm)</label>
                        <input type="number" id="marginBottom" min="0" max="50" value="10" />
                    </div>
                    
                    <div class="option-group">
                        <label for="marginLeft">Margin Left (mm)</label>
                        <input type="number" id="marginLeft" min="0" max="50" value="10" />
                    </div>
                    
                    <div class="option-group">
                        <label for="marginRight">Margin Right (mm)</label>
                        <input type="number" id="marginRight" min="0" max="50" value="10" />
                    </div>
                    
                    <div class="option-group">
                        <label for="paragraphSpacing">Paragraph Spacing (pt)</label>
                        <input type="number" id="paragraphSpacing" min="0" max="20" value="6" />
                    </div>
                    
                    <div class="option-group">
                        <label for="imageCompression">Image Compression</label>
                        <select id="imageCompression">
                            <option value="none">None</option>
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="maximum">Maximum</option>
                        </select>
                    </div>
                    
                    <div class="option-group">
                        <label for="imageProcessing">Image Processing</label>
                        <select id="imageProcessing">
                            <option value="original">Keep Original</option>
                            <option value="grayscale" selected>Grayscale</option>
                            <option value="blackwhite">Black & White</option>
                            <option value="remove">Remove Images</option>
                        </select>
                    </div>
                </div>
            </details>
        `;
        
        container.appendChild(advancedSection);
    },
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Preset cards
        document.querySelectorAll('.preset-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('preset-delete')) {
                    const presetKey = card.dataset.preset;
                    this.applyPreset(presetKey);
                }
            });
        });
        
        // Delete custom preset buttons
        document.querySelectorAll('.preset-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetKey = btn.dataset.preset;
                this.deleteCustomPreset(presetKey);
            });
        });
        
        // Save preset button
        document.getElementById('savePresetBtn')?.addEventListener('click', () => {
            this.saveCustomPreset();
        });
    },
    
    /**
     * Apply preset to UI
     */
    applyPreset(presetKey) {
        let preset;
        
        if (presetKey.startsWith('custom-')) {
            const customKey = presetKey.replace('custom-', '');
            preset = this.customPresets[customKey];
        } else {
            preset = this.presets[presetKey];
        }
        
        if (!preset) return;
        
        Utils.debug.log('Applying preset', { name: preset.name });
        
        const settings = preset.settings;
        
        // Apply all settings to UI
        Object.keys(settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = settings[key];
                } else {
                    element.value = settings[key];
                }
            }
        });
        
        // Highlight active preset
        document.querySelectorAll('.preset-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-preset="${presetKey}"]`)?.classList.add('active');
        
        this.currentPreset = presetKey;
        Utils.debug.success('Preset applied', { preset: preset.name });
    },
    
    /**
     * Get current settings from UI
     */
    getCurrentSettings() {
        const settings = {};
        
        const fields = [
            'pageSize', 'fontSize', 'contrast', 'lineSpacing', 'fontFamily',
            'alignment', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
            'paragraphSpacing', 'optimizeImages', 'imageCompression', 'imageProcessing'
        ];
        
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                settings[field] = element.type === 'checkbox' ? element.checked : element.value;
            }
        });
        
        return settings;
    },
    
    /**
     * Save custom preset
     */
    saveCustomPreset() {
        const name = prompt('Enter a name for this preset:');
        if (!name) return;
        
        const settings = this.getCurrentSettings();
        const key = Date.now().toString();
        
        this.customPresets[key] = {
            name: name,
            settings: settings
        };
        
        this.saveCustomPresetsToStorage();
        this.initUI(); // Refresh UI
        
        Utils.debug.success('Custom preset saved', { name });
    },
    
    /**
     * Delete custom preset
     */
    deleteCustomPreset(key) {
        if (confirm('Delete this custom preset?')) {
            delete this.customPresets[key];
            this.saveCustomPresetsToStorage();
            this.initUI(); // Refresh UI
            Utils.debug.log('Custom preset deleted', { key });
        }
    },
    
    /**
     * Load custom presets from localStorage
     */
    loadCustomPresets() {
        try {
            const stored = localStorage.getItem('remarkableCustomPresets');
            if (stored) {
                this.customPresets = JSON.parse(stored);
                Utils.debug.log('Custom presets loaded', { count: Object.keys(this.customPresets).length });
            }
        } catch (error) {
            Utils.debug.error('Failed to load custom presets', error);
        }
    },
    
    /**
     * Save custom presets to localStorage
     */
    saveCustomPresetsToStorage() {
        try {
            localStorage.setItem('remarkableCustomPresets', JSON.stringify(this.customPresets));
            Utils.debug.log('Custom presets saved to storage');
        } catch (error) {
            Utils.debug.error('Failed to save custom presets', error);
        }
    }
};
