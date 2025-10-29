// Document Parser
// Handles parsing of various document formats (PDF, DOCX, Markdown, CSV, Excel, PowerPoint, EPUB)

const DocumentParser = {
    /**
     * Main parsing function - routes to appropriate parser based on file type
     */
    async parse(file) {
        Utils.debug.log('DocumentParser.parse() called', { 
            fileName: file.name, 
            fileType: file.type,
            fileSize: file.size 
        });

        const extension = file.name.split('.').pop().toLowerCase();
        Utils.debug.log('File extension detected', extension);

        try {
            let parsedDocument;

            switch (extension) {
                case 'pdf':
                    parsedDocument = await this.parsePDF(file);
                    break;
                case 'docx':
                case 'doc':
                    parsedDocument = await this.parseDOCX(file);
                    break;
                case 'md':
                case 'markdown':
                    parsedDocument = await this.parseMarkdown(file);
                    break;
                case 'csv':
                    parsedDocument = await this.parseCSV(file);
                    break;
                case 'xlsx':
                case 'xls':
                    parsedDocument = await this.parseExcel(file);
                    break;
                case 'ppt':
                case 'pptx':
                    parsedDocument = await this.parsePowerPoint(file);
                    break;
                case 'epub':
                    parsedDocument = await this.parseEPUB(file);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${extension}`);
            }

            Utils.debug.success('Document parsed successfully', { 
                contentLength: parsedDocument.content?.length || 0,
                hasContent: !!parsedDocument.content,
                hasPages: !!parsedDocument.pages,
                imageCount: parsedDocument.images?.length || 0
            });

            return parsedDocument;
        } catch (error) {
            Utils.debug.error('Document parsing failed', error);
            throw error;
        }
    },

    /**
     * Parse PDF document - HYBRID APPROACH
     * Tries native extraction first, falls back to OCR if quality is poor
     */
    async parsePDF(file) {
        Utils.debug.log('Parsing PDF document...');

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        Utils.debug.log('PDF loaded', { numPages: pdf.numPages });

        let fullText = '';
        const images = [];
        let usedOCR = false;

        // STEP 1: Try native text extraction
        Utils.debug.log('Attempting native text extraction...');

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            // Extract text using native PDF.js
            const pageText = await this.extractTextFromPage(page);
            fullText += pageText + '\n\n';

            Utils.debug.log(`Page ${pageNum} extracted`, {
                textLength: pageText.length,
                hasContent: !!pageText
            });

            // Extract images
            const pageImages = await this.extractImagesFromPage(page, pageNum);
            images.push(...pageImages);
        }

        Utils.debug.log('Native extraction complete: ' + fullText.length + ' characters');

        // STEP 2: Check text quality
        const textQuality = this.assessTextQuality(fullText, pdf.numPages);
        Utils.debug.log('Text quality assessment:', textQuality);

        // STEP 3: Use OCR if native extraction is poor quality
        if (textQuality.shouldUseOCR && typeof OCRManager !== 'undefined') {
            Utils.debug.warn('Poor text quality detected, switching to OCR...');

            fullText = '';
            usedOCR = true;

            // Re-process with OCR
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);

                try {
                    const ocrText = await OCRManager.processPage(page, pageNum, pdf.numPages);
                    fullText += ocrText + '\n\n';

                    Utils.debug.success(`Page ${pageNum} OCR complete`, {
                        textLength: ocrText.length
                    });
                } catch (error) {
                    Utils.debug.error(`OCR failed for page ${pageNum}, using native extraction`, error);
                }
            }

            OCRManager.hideProgress();
            Utils.debug.success('OCR extraction complete: ' + fullText.length + ' characters');
        }

        // STEP 4: Clean the extracted text (minimal intervention)
        fullText = this.cleanExtractedText(fullText);
        Utils.debug.log('Text cleaned');

        Utils.debug.success('PDF parsing complete', {
            totalPages: pdf.numPages,
            totalTextLength: fullText.trim().length,
            totalImages: images.length,
            usedOCR: usedOCR,
            quality: textQuality
        });

        return {
            type: 'pdf',
            content: fullText.trim(),
            images: images,
            pageCount: pdf.numPages,
            extractionMethod: usedOCR ? 'ocr' : 'native'
        };
    },

    /**
     * Extract text from a PDF page - FIXED for proper reading order
     * Groups items by line (Y-position) before building text
     */
    async extractTextFromPage(page) {
        const textContent = await page.getTextContent();
        const items = textContent.items;

        if (items.length === 0) return '';

        // Group items by their vertical position (line)
        const lines = [];
        const lineThreshold = 5; // Items within 5pt vertically are on same line

        for (const item of items) {
            if (!item.str || !item.transform) continue;

            const x = item.transform[4];
            const y = item.transform[5];
            const fontSize = Math.abs(item.transform[3]);

            // Find existing line or create new one
            let foundLine = null;
            for (const line of lines) {
                if (Math.abs(line.y - y) <= lineThreshold) {
                    foundLine = line;
                    break;
                }
            }

            if (foundLine) {
                foundLine.items.push({ x, y, str: item.str, fontSize, width: item.width });
            } else {
                lines.push({
                    y: y,
                    items: [{ x, y, str: item.str, fontSize, width: item.width }]
                });
            }
        }

        // Sort lines by Y-position (top to bottom, accounting for PDF coordinate system)
        lines.sort((a, b) => b.y - a.y);

        // Within each line, sort items by X-position (left to right)
        for (const line of lines) {
            line.items.sort((a, b) => a.x - b.x);
        }

        // Build text from sorted lines
        let text = '';
        let lastY = null;
        let lastFontSize = null;

        for (const line of lines) {
            // Determine spacing before this line
            if (lastY !== null && line.items.length > 0) {
                const verticalGap = Math.abs(lastY - line.y);
                const avgFontSize = (line.items[0].fontSize + (lastFontSize || line.items[0].fontSize)) / 2;

                // Paragraph break for large gaps
                if (verticalGap > avgFontSize * 2.5) {
                    text += '\n\n';
                } else if (verticalGap > avgFontSize * 0.8) {
                    text += '\n';
                } else {
                    // Items are very close vertically, might be same line
                    if (text && !text.endsWith(' ') && !text.endsWith('\n')) {
                        text += ' ';
                    }
                }
            }

            // Add items from this line
            let lastX = null;
            for (const item of line.items) {
                // Add horizontal spacing between items on same line
                if (lastX !== null) {
                    const horizontalGap = item.x - lastX;
                    const avgFontSize = item.fontSize;

                    if (horizontalGap > avgFontSize * 0.3) {
                        text += ' ';
                    }
                }

                text += item.str;
                lastX = item.x + item.width;
            }

            lastY = line.y;
            if (line.items.length > 0) {
                lastFontSize = line.items[0].fontSize;
            }
        }

        return text.trim();
    },

    /**
     * Assess text quality to determine if OCR should be used
     */
    assessTextQuality(text, pageCount) {
        const avgCharsPerPage = text.length / pageCount;
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / (words.length || 1);

        // Calculate suspicious patterns
        const suspiciousChars = (text.match(/[����������]/g) || []).length;
        const suspiciousRatio = suspiciousChars / (text.length || 1);

        // Check for excessive single-character words (might indicate broken text)
        const singleCharWords = words.filter(w => w.length === 1).length;
        const singleCharRatio = singleCharWords / (words.length || 1);

        const shouldUseOCR =
            avgCharsPerPage < 50 ||             // Too few characters (likely scanned)
            suspiciousRatio > 0.05 ||           // Too many encoding issues
            singleCharRatio > 0.3 ||            // Too many single-char words
            avgWordLength < 2;                  // Words too short (broken)

        return {
            avgCharsPerPage,
            avgWordLength,
            suspiciousRatio,
            singleCharRatio,
            shouldUseOCR,
            quality: shouldUseOCR ? 'poor' : 'good'
        };
    },

    /**
     * Clean extracted text - MINIMAL intervention
     * Only remove truly problematic characters, preserve original formatting
     */
    cleanExtractedText(text) {
        if (!text) return '';

        // Step 1: Remove control characters (but keep newlines and tabs)
        text = text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');

        // Step 2: Normalize line endings only
        text = text.replace(/\r\n/g, '\n');
        text = text.replace(/\r/g, '\n');

        // Step 3: Remove zero-width and invisible characters
        text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

        // Step 4: Preserve structure - detect and maintain formatting elements
        text = this.preserveDocumentStructure(text);

        return text.trim();
    },

    /**
     * Preserve document structure - keep original formatting intact
     * Detects headings, lists, and paragraphs as they appear in source
     */
    preserveDocumentStructure(text) {
        const lines = text.split('\n');
        const processedLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trimEnd();

            // Preserve empty lines (paragraph breaks)
            if (!line) {
                processedLines.push('');
                continue;
            }

            // Detect and preserve numbered lists (1. 2. 3. or 1) 2) 3))
            if (/^\s*\d+[\.\)]\s+/.test(line)) {
                // Ensure blank line before list if not already there
                if (i > 0 && processedLines[processedLines.length - 1] !== '') {
                    processedLines.push('');
                }
                processedLines.push(line.trim());
                continue;
            }

            // Detect and preserve bullet points
            if (/^\s*[•\-\*○▪☐☑]\s+/.test(line)) {
                // Ensure blank line before bullet if not already there
                if (i > 0 && processedLines[processedLines.length - 1] !== '') {
                    processedLines.push('');
                }
                processedLines.push(line.trim());
                continue;
            }

            // Detect ALL CAPS headings (likely section headers)
            if (line.length < 100 && /^[A-Z\s]{3,}$/.test(line.trim())) {
                // Add spacing around headings
                if (i > 0 && processedLines[processedLines.length - 1] !== '') {
                    processedLines.push('');
                }
                processedLines.push(line.trim());
                processedLines.push('');
                continue;
            }

            // Regular line - preserve as is
            processedLines.push(line);
        }

        // Limit excessive blank lines but allow up to 2
        let result = processedLines.join('\n');
        result = result.replace(/\n{4,}/g, '\n\n\n');

        return result;
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
                    fn === pdfjsLib.OPS.paintJpegXObject) {
                    
                    try {
                        const imageName = args[0];
                        
                        // Get the image from the page's resources
                        const resources = await page.objs.get(imageName);
                        
                        if (resources && resources.data) {
                            images.push({
                                page: pageNumber,
                                name: imageName,
                                data: resources.data,
                                width: resources.width,
                                height: resources.height
                            });
                        }
                    } catch (imgError) {
                        Utils.debug.warn('Failed to extract image', imgError);
                    }
                }
            }
        } catch (error) {
            Utils.debug.warn('Image extraction failed for page ' + pageNumber, error);
        }
        
        return images;
    },

    /**
     * Parse DOCX document
     */
    async parseDOCX(file) {
        Utils.debug.log('Parsing DOCX document...');

        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });

        return {
            type: 'docx',
            content: result.value,
            images: []
        };
    },

    /**
     * Parse Markdown document
     */
    async parseMarkdown(file) {
        Utils.debug.log('Parsing Markdown document...');

        const text = await file.text();
        const md = window.markdownit();
        const html = md.render(text);

        // Extract plain text from HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const plainText = tempDiv.textContent || tempDiv.innerText;

        return {
            type: 'markdown',
            content: plainText,
            images: []
        };
    },

    /**
     * Parse CSV document
     */
    async parseCSV(file) {
        Utils.debug.log('Parsing CSV document...');

        const text = await file.text();
        const parsed = Papa.parse(text, { header: true });

        // Convert CSV to formatted text
        let content = '';
        if (parsed.data && parsed.data.length > 0) {
            // Add headers
            const headers = Object.keys(parsed.data[0]);
            content += headers.join(' | ') + '\n';
            content += headers.map(() => '---').join(' | ') + '\n';

            // Add rows
            for (const row of parsed.data) {
                const values = headers.map(h => row[h] || '');
                content += values.join(' | ') + '\n';
            }
        }

        return {
            type: 'csv',
            content: content,
            images: []
        };
    },

    /**
     * Parse Excel document
     */
    async parseExcel(file) {
        Utils.debug.log('Parsing Excel document...');

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        let content = '';
        for (const sheetName of workbook.SheetNames) {
            content += `\n=== ${sheetName} ===\n\n`;
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            content += csv + '\n';
        }

        return {
            type: 'excel',
            content: content,
            images: []
        };
    },

    /**
     * Parse PowerPoint document
     */
    async parsePowerPoint(file) {
        Utils.debug.log('Parsing PowerPoint document...');

        // PowerPoint parsing is complex, for now just return a placeholder
        return {
            type: 'powerpoint',
            content: 'PowerPoint parsing not yet implemented. Please convert to PDF first.',
            images: []
        };
    },

    /**
     * Parse EPUB document
     */
    async parseEPUB(file) {
         Utils.debug.log('Parsing EPUB document...');
        // EPUB parsing is complex, for now just return a placeholder
        return {
            type: 'epub',
            content: 'EPUB parsing not yet implemented. Please convert to PDF first.',
            images: []
        };
    },
    
};
