// Document Parser Module
// Handles parsing of multiple document formats: PDF, DOCX, MD, CSV, XLSX, PPT, PPTX, EPUB
// FIXED: Now extracts images and improves text formatting

const DocumentParser = {
    /**
     * Main parse function - routes to appropriate parser based on file type
     */
    async parse(file) {
        Utils.debug.log('DocumentParser.parse() called', { fileName: file.name, fileType: file.type, fileSize: file.size });
        
        const extension = Utils.getFileExtension(file.name);
        Utils.debug.log('File extension detected', extension);

        try {
            let result;
            switch (extension) {
                case 'pdf':
                    result = await this.parsePDF(file);
                    break;
                case 'docx':
                case 'doc':
                    result = await this.parseDOCX(file);
                    break;
                case 'md':
                case 'markdown':
                    result = await this.parseMarkdown(file);
                    break;
                case 'csv':
                    result = await this.parseCSV(file);
                    break;
                case 'xlsx':
                case 'xls':
                    result = await this.parseExcel(file);
                    break;
                case 'ppt':
                case 'pptx':
                    result = await this.parsePowerPoint(file);
                    break;
                case 'epub':
                    result = await this.parseEPUB(file);
                    break;
                default:
                    throw new Error('Unsupported file format: ' + extension);
            }

            Utils.debug.success('Document parsed successfully', { 
                contentLength: result.content?.length || 0,
                hasContent: !!result.content,
                hasPages: !!result.pages,
                imageCount: result.images?.length || 0
            });

            // CRITICAL FIX: Ensure we always return content
            if (!result.content && !result.pages) {
                throw new Error('Parser returned empty content');
            }

            return result;
        } catch (error) {
            Utils.debug.error('Document parsing failed', error);
            throw error;
        }
    },

    /**
     * Parse PDF files - FIXED: Now extracts images and improves text formatting
     */
    async parsePDF(file) {
        Utils.debug.log('Parsing PDF document...');
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        Utils.debug.log('PDF loaded', { numPages: pdf.numPages });
        
        let fullText = '';
        let extractedChars = 0;
        const extractedImages = [];
        
        // First pass: Extract text with IMPROVED formatting and extract images
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // IMPROVED: Better text extraction with proper line detection
            const pageText = this.extractTextWithFormatting(textContent.items);
            fullText += pageText + '\n\n'; // Double newline between pages
            extractedChars += pageText.length;
            
            // NEW: Extract images from page
            const pageImages = await this.extractImagesFromPage(page, i);
            extractedImages.push(...pageImages);
            
            Utils.debug.log(`Page ${i} extracted`, { 
                textLength: pageText.length, 
                hasContent: pageText.trim().length > 0,
                imageCount: pageImages.length
            });
        }
        
        Utils.debug.log(`Text extraction complete: ${extractedChars} characters from ${pdf.numPages} pages`);
        Utils.debug.log(`Image extraction complete: ${extractedImages.length} images found`);
        
        // Check if this is a scanned PDF (very little text extracted)
        const isScannedPDF = extractedChars < 200;
        
        if (isScannedPDF) {
            Utils.debug.log('Scanned PDF detected. Starting OCR processing...');
            fullText = ''; // Reset
            
            // Show OCR status
            this.showOCRProgress(1, pdf.numPages);
            
            // OCR pass with improved extraction
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const ocrText = await this.extractPageWithOCR(page, i, pdf.numPages);
                fullText += ocrText.trim() + '\n\n';
            }
            
            // Clear OCR status
            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.style.display = 'none';
            }
            
            Utils.debug.log(`OCR completed: ${fullText.length} characters extracted`);
        }
        
        // Clean up the text
        fullText = this.cleanExtractedText(fullText);
        
        Utils.debug.success('PDF parsing complete', { 
            totalPages: pdf.numPages, 
            totalTextLength: fullText.length,
            totalImages: extractedImages.length,
            usedOCR: isScannedPDF
        });
        
        return {
            type: 'pdf',
            content: fullText,
            images: extractedImages,
            metadata: {
                pageCount: pdf.numPages,
                title: file.name,
                usedOCR: isScannedPDF,
                imageCount: extractedImages.length
            }
        };
    },

    /**
     * NEW: Extract text with improved formatting detection
     */
    extractTextWithFormatting(items) {
        if (!items || items.length === 0) return '';
        
        let text = '';
        let lastY = null;
        let lastX = null;
        let lastHeight = null;
        let lastItem = null;
        
        // Sort items by Y position (top to bottom), then X position (left to right)
        const sortedItems = items.slice().sort((a, b) => {
            const yDiff = Math.abs(a.transform[5] - b.transform[5]);
            if (yDiff > 2) {
                return b.transform[5] - a.transform[5]; // Top to bottom
            }
            return a.transform[4] - b.transform[4]; // Left to right
        });
        
        for (const item of sortedItems) {
            if (!item.str) continue;
            
            const y = item.transform[5];
            const x = item.transform[4];
            const height = item.height || 12;
            
            // IMPROVED: Detect new lines based on multiple factors
            if (lastY !== null) {
                const yDiff = Math.abs(y - lastY);
                const avgHeight = lastHeight ? (height + lastHeight) / 2 : height;
                
                // New line if:
                // 1. Y position changed significantly (more than half the font height)
                // 2. OR X position reset to left (new paragraph)
                if (yDiff > avgHeight * 0.3) {
                    // Determine if it's a paragraph break or just a line break
                    if (yDiff > avgHeight * 1.5) {
                        text += '\n\n'; // Paragraph break
                    } else {
                        text += '\n'; // Line break
                    }
                } else if (lastX !== null && x < lastX - 50) {
                    // X position reset significantly = new line
                    text += '\n';
                }
            }
            
            // Add spacing if needed (not at line start)
            const itemStr = item.str.trim();
            if (itemStr) {
                // FIXED: Much more robust space detection
                const needsSpace = text.length > 0 && 
                                   !text.endsWith('\n') && 
                                   !text.endsWith(' ');
                
                // Check multiple conditions for space (use OR logic, not else-if):
                if (needsSpace) {
                    let shouldAddSpace = false;
                    
                    // 1. Item explicitly has leading/trailing whitespace
                    if (item.str.startsWith(' ') || (lastItem && lastItem.str.endsWith(' '))) {
                        shouldAddSpace = true;
                    }
                    // 2. Previous item has hasEOL flag (PDF.js indicator for whitespace)
                    else if (lastItem && lastItem.hasEOL) {
                        shouldAddSpace = true;
                    }
                    // 3. Check horizontal gap between items
                    else if (lastX !== null && lastItem) {
                        // Calculate the gap between end of last item and start of current item
                        const gap = x - lastX;
                        // Use a small threshold (2 pixels) to detect word boundaries
                        if (gap > 2) {
                            shouldAddSpace = true;
                        }
                    }
                    
                    // 4. FALLBACK: Always add space between alphanumeric characters
                    // This is the most important fix - ensures words are always separated
                    if (!shouldAddSpace && text.length > 0 && !text.endsWith('-')) {
                        const lastChar = text[text.length - 1];
                        const firstChar = itemStr[0];
                        // Add space if transitioning between alphanumeric characters
                        if (/[a-zA-Z0-9]/.test(lastChar) && /[a-zA-Z0-9]/.test(firstChar)) {
                            shouldAddSpace = true;
                        }
                        // Also add space after punctuation that typically needs it
                        else if (/[,;:\)\]\}\.!?]/.test(lastChar) && /[a-zA-Z0-9]/.test(firstChar)) {
                            shouldAddSpace = true;
                        }
                    }
                    
                    if (shouldAddSpace) {
                        text += ' ';
                    }
                }
                
                text += itemStr;
                lastItem = item;
            }
            
            lastY = y;
            lastX = x + (item.width || 0);
            lastHeight = height;
        }
        
        return text.trim();
    },

    /**
     * NEW: Extract images from a PDF page
     */
    async extractImagesFromPage(page, pageNumber) {
        const images = [];
        
        try {
            const operatorList = await page.getOperatorList();
            
            for (let i = 0; i < operatorList.fnArray.length; i++) {
                const fn = operatorList.fnArray[i];
                const args = operatorList.argsArray[i];
                
                // Check for image painting operations
                if (fn === pdfjsLib.OPS.paintImageXObject || 
                    fn === pdfjsLib.OPS.paintInlineImageXObject ||
                    fn === pdfjsLib.OPS.paintImageMaskXObject) {
                    
                    try {
                        const imageName = args[0];
                        
                        // Get the image from page resources
                        const resources = await page.objs.get(imageName);
                        
                        if (resources && resources.data) {
                            // Create canvas to convert image data
                            const canvas = document.createElement('canvas');
                            canvas.width = resources.width || 100;
                            canvas.height = resources.height || 100;
                            const ctx = canvas.getContext('2d');
                            
                            // Create ImageData from the raw data
                            const imageData = ctx.createImageData(canvas.width, canvas.height);
                            
                            // Copy pixel data
                            if (resources.data.length === imageData.data.length) {
                                imageData.data.set(resources.data);
                            } else {
                                // Handle different formats
                                const srcData = resources.data;
                                const destData = imageData.data;
                                const numPixels = canvas.width * canvas.height;
                                
                                for (let j = 0; j < numPixels; j++) {
                                    const srcOffset = j * (srcData.length / numPixels);
                                    const destOffset = j * 4;
                                    
                                    if (srcData.length / numPixels === 3) {
                                        // RGB
                                        destData[destOffset] = srcData[srcOffset];
                                        destData[destOffset + 1] = srcData[srcOffset + 1];
                                        destData[destOffset + 2] = srcData[srcOffset + 2];
                                        destData[destOffset + 3] = 255;
                                    } else if (srcData.length / numPixels === 1) {
                                        // Grayscale
                                        const gray = srcData[srcOffset];
                                        destData[destOffset] = gray;
                                        destData[destOffset + 1] = gray;
                                        destData[destOffset + 2] = gray;
                                        destData[destOffset + 3] = 255;
                                    }
                                }
                            }
                            
                            ctx.putImageData(imageData, 0, 0);
                            
                            // Convert to data URL
                            const imageDataUrl = canvas.toDataURL('image/png');
                            
                            images.push({
                                page: pageNumber,
                                data: imageDataUrl,
                                width: canvas.width,
                                height: canvas.height,
                                name: imageName || `image_p${pageNumber}_${images.length + 1}`
                            });
                            
                            // Clean up
                            canvas.width = 0;
                            canvas.height = 0;
                        }
                    } catch (imgError) {
                        Utils.debug.warn(`Could not extract image on page ${pageNumber}`, imgError);
                    }
                }
            }
        } catch (error) {
            Utils.debug.error(`Failed to extract images from page ${pageNumber}`, error);
        }
        
        return images;
    },

    /**
     * Parse DOCX files
     */
    async parseDOCX(file) {
        Utils.debug.log('Parsing DOCX document...');
        
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
        
        Utils.debug.log('DOCX parsed', { htmlLength: result.value.length, warnings: result.messages.length });
        
        if (result.messages.length > 0) {
            Utils.debug.warn('DOCX parsing warnings', result.messages);
        }

        const plainText = Utils.htmlToText(result.value);
        
        return {
            type: 'docx',
            content: plainText,
            html: result.value,
            metadata: {
                title: file.name,
                warnings: result.messages
            }
        };
    },

    /**
     * Parse Markdown files
     */
    async parseMarkdown(file) {
        Utils.debug.log('Parsing Markdown document...');
        
        const text = await file.text();
        const html = Utils.parseMarkdown(text);
        
        Utils.debug.success('Markdown parsed', { textLength: text.length, htmlLength: html.length });
        
        return {
            type: 'markdown',
            content: text,
            html: html,
            metadata: {
                title: file.name
            }
        };
    },

    /**
     * Parse CSV files
     */
    async parseCSV(file) {
        Utils.debug.log('Parsing CSV document...');
        
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                complete: function(results) {
                    Utils.debug.success('CSV parsed', { rows: results.data.length, columns: results.data[0]?.length || 0 });
                    
                    // Convert CSV to readable text format
                    const text = results.data.map(row => row.join(' | ')).join('\n');
                    
                    // Convert to HTML table
                    let html = '<table border="1" style="border-collapse: collapse; width: 100%;">\n';
                    results.data.forEach((row, index) => {
                        const tag = index === 0 ? 'th' : 'td';
                        html += `<tr>${row.map(cell => `<${tag}>${cell}</${tag}>`).join('')}</tr>\n`;
                    });
                    html += '</table>';
                    
                    resolve({
                        type: 'csv',
                        content: text,
                        html: html,
                        metadata: {
                            title: file.name,
                            rows: results.data.length,
                            columns: results.data[0]?.length || 0
                        }
                    });
                },
                error: function(error) {
                    reject(error);
                }
            });
        });
    },

    /**
     * Parse Excel files
     */
    async parseExcel(file) {
        Utils.debug.log('Parsing Excel document...');
        
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        let text = '';
        let html = '<div>';
        
        workbook.SheetNames.forEach((sheetName, index) => {
            html += `<div style="page-break-after: always;"><h2>Sheet ${index + 1}: ${sheetName}</h2>`;
            const worksheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Add to text
            const sheetText = sheetData.map(row => row.join(' | ')).join('\n');
            text += `\n\n=== Sheet ${index + 1}: ${sheetName} ===\n\n${sheetText}`;
            
            // Add to HTML
            html += '<table border="1" style="border-collapse: collapse; width: 100%; margin-top: 10px;">\n';
            sheetData.forEach((row, rowIndex) => {
                const tag = rowIndex === 0 ? 'th' : 'td';
                html += `<tr>${row.map(cell => `<${tag}>${cell || ''}</${tag}>`).join('')}</tr>\n`;
            });
            html += '</table></div>';
            
            Utils.debug.log(`Sheet processed: ${sheetName}`, { textLength: sheetText.length });
        });
        
        html += '</div>';
        
        Utils.debug.success('Excel parsing complete', { sheets: workbook.SheetNames.length });
        
        return {
            type: 'excel',
            content: text.trim(),
            html: html,
            metadata: {
                title: file.name,
                sheets: workbook.SheetNames,
                sheetCount: workbook.SheetNames.length
            }
        };
    },

    /**
     * Parse PowerPoint files
     */
    async parsePowerPoint(file) {
        Utils.debug.log('Parsing PowerPoint document...');
        Utils.debug.warn('PowerPoint parsing has limited support - extracting text only');
        
        const arrayBuffer = await file.arrayBuffer();
        
        try {
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            let text = '';
            let html = '<div>';
            
            workbook.SheetNames.forEach((sheetName, index) => {
                html += `<div style="page-break-after: always;"><h2>Slide ${index + 1}: ${sheetName}</h2>`;
                const worksheet = workbook.Sheets[sheetName];
                const sheetText = XLSX.utils.sheet_to_csv(worksheet);
                text += `\n\n=== Slide ${index + 1}: ${sheetName} ===\n\n${sheetText}`;
                html += `<pre>${sheetText}</pre></div>`;
            });
            
            html += '</div>';
            
            Utils.debug.success('PowerPoint text extracted', { slides: workbook.SheetNames.length });
            
            return {
                type: 'powerpoint',
                content: text.trim() || 'PowerPoint content (text extraction limited)',
                html: html,
                metadata: {
                    title: file.name,
                    slideCount: workbook.SheetNames.length,
                    note: 'Limited text extraction only'
                }
            };
        } catch (error) {
            Utils.debug.warn('Could not extract PowerPoint content', error);
            return {
                type: 'powerpoint',
                content: `PowerPoint File: ${file.name}\n\nNote: Full PowerPoint parsing requires server-side processing.`,
                html: `<p>PowerPoint File: <strong>${file.name}</strong></p><p><em>Note: Full PowerPoint parsing requires server-side processing.</em></p>`,
                metadata: {
                    title: file.name,
                    note: 'Limited support'
                }
            };
        }
    },

    /**
     * Parse EPUB files
     */
    async parseEPUB(file) {
        Utils.debug.log('Parsing EPUB document...');
        Utils.debug.warn('EPUB parsing has limited support - basic text extraction');
        
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        
        const content = text
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 50000);
        
        Utils.debug.success('EPUB basic extraction complete', { contentLength: content.length });
        
        return {
            type: 'epub',
            content: content || 'EPUB content (basic extraction)',
            metadata: {
                title: file.name,
                note: 'Basic text extraction only'
            }
        };
    },

    /**
     * Clean extracted text - remove artifacts and normalize whitespace
     */
    cleanExtractedText: function(text) {
        if (!text) return '';
        
        // Remove excessive whitespace while preserving paragraph breaks
        text = text.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
        text = text.replace(/\n{3,}/g, '\n\n'); // Multiple newlines to double newline
        text = text.replace(/^\s+|\s+$/gm, ''); // Trim lines
        
        // Fix common extraction artifacts
        text = text.replace(/\u00AD/g, ''); // Remove soft hyphens
        text = text.replace(/\uFEFF/g, ''); // Remove zero-width no-break space
        text = text.replace(/[\u200B-\u200D]/g, ''); // Remove zero-width spaces
        
        // Remove control characters except newlines and tabs
        text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
        
        return text.trim();
    },

    /**
     * Extract text from a PDF page using OCR (for scanned documents)
     */
    extractPageWithOCR: async function(page, pageNum, totalPages) {
        Utils.debug.log(`Attempting OCR on page ${pageNum}/${totalPages}`);
        
        try {
            this.showOCRProgress(pageNum, totalPages);
            
            const scale = 2.5;
            const viewport = page.getViewport({ scale: scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport,
                intent: 'print'
            };
            
            await page.render(renderContext).promise;
            
            Utils.debug.log(`Page ${pageNum} rendered to canvas for OCR`, {
                width: canvas.width,
                height: canvas.height
            });
            
            const imageData = canvas.toDataURL('image/png');
            
            const { data: { text } } = await Tesseract.recognize(
                imageData,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(m.progress * 100);
                            Utils.debug.log(`Page ${pageNum} OCR: ${progress}%`);
                        }
                    },
                    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                    preserve_interword_spaces: '1'
                }
            );
            
            canvas.width = 0;
            canvas.height = 0;
            
            Utils.debug.log(`OCR complete for page ${pageNum}`, {
                textLength: text.length
            });
            
            return text || '';
            
        } catch (error) {
            Utils.debug.error(`OCR failed for page ${pageNum}`, error);
            return '';
        }
    },

    /**
     * Update UI to show OCR progress
     */
    showOCRProgress: function(pageNum, totalPages) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = `Performing OCR: Page ${pageNum}/${totalPages}...`;
            statusEl.className = 'processing';
            statusEl.style.display = 'block';
        }
    },

    /**
     * Get formatted timestamp for logging
     */
    getTime: function() {
        return new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true 
        });
    },
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocumentParser;
}
