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
     * Parse PDF document
     */
    async parsePDF(file) {
        Utils.debug.log('Parsing PDF document...');

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        Utils.debug.log('PDF loaded', { numPages: pdf.numPages });

        let fullText = '';
        const images = [];

        // Extract text and images from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            // Extract text
            const pageText = await this.extractTextFromPage(page);
            fullText += pageText;

            // Add page separator (paragraph break between pages is natural)
            if (pageNum < pdf.numPages) {
                fullText += '\n\n';
            }

            Utils.debug.log(`Page ${pageNum} extracted`, {
                textLength: pageText.length,
                hasContent: !!pageText,
                imageCount: 0
            });

            // Extract images
            const pageImages = await this.extractImagesFromPage(page, pageNum);
            images.push(...pageImages);
        }

        Utils.debug.log('Text extraction complete: ' + fullText.length + ' characters from ' + pdf.numPages + ' pages');
        Utils.debug.log('Image extraction complete: ' + images.length + ' images found');

        // TEMPORARILY DISABLED - testing if this is where text gets destroyed
        // fullText = this.smartFormatCleanup(fullText);
        Utils.debug.log('smartFormatCleanup SKIPPED - using raw extracted text');

        Utils.debug.success('PDF parsing complete', { 
            totalPages: pdf.numPages,
            totalTextLength: fullText.trim().length,
            totalImages: images.length,
            usedOCR: false
        });

        return {
            type: 'pdf',
            content: fullText.trim(),
            images: images,
            pageCount: pdf.numPages
        };
    },

    /**
     * Extract text from a PDF page - SIMPLIFIED to preserve original layout
     */
    async extractTextFromPage(page) {
        const textContent = await page.getTextContent();
        const items = textContent.items;

        // Sort items by position (top to bottom, left to right)
        items.sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5]; // Y position (inverted in PDF)
            if (Math.abs(yDiff) > 5) return yDiff; // Different lines
            return a.transform[4] - b.transform[4]; // Same line, sort by X
        });

        let text = '';
        let lastY = null;
        let lastX = null;

        for (const item of items) {
            if (!item.str) continue;

            const x = item.transform[4];
            const y = item.transform[5];
            const str = item.str;

            // Detect line breaks by Y position change
            if (lastY !== null && Math.abs(y - lastY) > 5) {
                text += '\n';
            }
            // Detect word spacing by X gap
            else if (lastX !== null && (x - lastX) > 5) {
                text += ' ';
            }

            text += str;
            lastY = y;
            lastX = x + (item.width || 0);
        }

        return text.trim();
    },

    /**
     * COMPLETELY DISABLED - causes more problems than it solves
     */
    fixBrokenWords(text) {
        // DO NOTHING - return text unchanged
        return text;
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
    
    /**
     * MINIMAL cleanup - ONLY fix encoding errors, preserve ALL layout
     *
     * CRITICAL: This function must NOT change document structure, line breaks, or spacing
     * It should ONLY fix character encoding corruption
     */
    smartFormatCleanup(text) {
        Utils.debug.log('smartFormatCleanup - minimal encoding fixes only', {
            length: text.length,
            firstChars: text.substring(0, 100)
        });

        // ONLY fix obvious encoding corruption - DO NOT change layout
        // These are character-level fixes that don't affect structure

        // Fix common encoding errors that are clearly corruption
        text = text.replace(/\bPEAKERS\b/g, 'SPEAKERS'); // Common OCR error

        // REMOVED: Newline reduction - preserve ALL blank lines exactly as they are

        Utils.debug.log('smartFormatCleanup complete - layout preserved', {
            length: text.length
        });

        return text;
    }
};
