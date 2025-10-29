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
            fullText += pageText + '\n\n';

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
        
        // Apply smart formatting cleanup
        fullText = this.smartFormatCleanup(fullText);
        Utils.debug.log('Smart formatting applied');

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
     * Extract text from a PDF page with proper spacing
     */
    async extractTextFromPage(page) {
        const textContent = await page.getTextContent();
        let text = '';
        let lastItem = null;
        let lastX = null;
        let lastY = null;
        let lastHeight = null;

        for (const item of textContent.items) {
            if (!item.str) continue;

            const { transform, str, width, height } = item;
            const x = transform[4];
            const y = transform[5];

            // Check for new line - improved detection
            if (lastY !== null) {
                const verticalGap = Math.abs(y - lastY);
                const lineHeightThreshold = (lastHeight || 5) * 0.3;
                
                // Add line break if vertical position changed significantly
                if (verticalGap > lineHeightThreshold) {
                    if (text && !text.endsWith('\n')) {
                        text += '\n';
                    }
                }
                // Also detect paragraph breaks (larger vertical gaps)
                else if (verticalGap > (lastHeight || 5) * 1.5) {
                    if (text && !text.endsWith('\n\n')) {
                        text += '\n\n';
                    }
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
        
        // FIX: Aggressively reconstruct broken words from Type 3 fonts
        text = this.fixBrokenWords(text);
        
        return text.trim();
    },

    /**
     * Fix broken words caused by Type 3 fonts and ligature splitting
     * This is a more aggressive approach that merges single letters separated by spaces
     */
    fixBrokenWords(text) {
        // Strategy: Look for patterns like "w o r d" and merge them back to "word"
        // But be careful not to merge actual separate words
        
        // First pass: Fix obvious ligature splits (f i, f f, etc.)
        text = text.replace(/\bf\s+i\b/gi, 'fi');
        text = text.replace(/\bf\s+f\b/gi, 'ff');
        text = text.replace(/\bf\s+l\b/gi, 'fl');
        text = text.replace(/\bf\s+f\s+i\b/gi, 'ffi');
        text = text.replace(/\bf\s+f\s+l\b/gi, 'ffl');
        
        // Second pass: More aggressive - look for single letters with spaces in between
        // Pattern: letter space letter (where both are lowercase or both match case)
        // This catches patterns like "di ff erent" -> "different"
        
        // Split into lines to process line by line
        const lines = text.split('\n');
        const fixedLines = lines.map(line => {
            // Look for sequences of single letters separated by single spaces
            // Pattern: lowercase letter, space, lowercase letter
            let fixed = line;
            
            // Repeatedly merge single-letter sequences until no more found
            let iterations = 0;
            const maxIterations = 20; // Prevent infinite loops
            
            while (iterations < maxIterations) {
                const before = fixed;
                
                // Merge single lowercase letters separated by a single space
                // But only if they're part of a larger sequence
                fixed = fixed.replace(/\b([a-z])\s+([a-z])\s+([a-z])/g, '$1$2 $3');
                fixed = fixed.replace(/\b([a-z])\s+([a-z])\b/g, '$1$2');
                
                // If nothing changed, we're done
                if (fixed === before) break;
                iterations++;
            }
            
            return fixed;
        });
        
        return fixedLines.join('\n');
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
     * Smart formatting cleanup - adds line breaks for better structure
     * This preserves numbered lists, headings, and paragraph breaks
     */
    smartFormatCleanup(text) {
        // Fix encoding issues - replace ðý with proper bullet (multiple patterns)
        text = text.replace(/ðý/g, '\n• ');
        text = text.replace(/ð ý/g, '\n• ');
        text = text.replace(/ð\s*ý/g, '\n• ');
        text = text.replace(/ðý/g, '\n• ');
        text = text.replace(/ð ý/g, '\n• ');
        
        // Fix common concatenated words (add space between lowercase and uppercase)
        text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
        
        // Fix page numbers at start of lines followed by text
        text = text.replace(/(^|\n)(\d+)([A-Z][a-z])/gm, '$1$2\n$3');
        
        // Fix multi-digit page numbers like "414" -> "4\n14"
        text = text.replace(/(^|\n)(\d)(\d{2,})([A-Z])/gm, '$1$2\n$3\n$4');
        
        // Fix words running together - add space before common prefixes/suffixes
        text = text.replace(/([a-z])(in|ed|ing|system|anxiety|attachment)([A-Z])/g, '$1$2 $3');
        
        // Add spaces in obvious concatenations (EXPANDED LIST)
        const concatenations = [
            ['utilizedin', 'utilized in'],
            ['includingphotocopying', 'including photocopying'],
            ['retrievalsystem', 'retrieval system'],
            ['separationanxiety', 'separation anxiety'],
            ['majorattachment', 'major attachment'],
            ['experiencingan', 'experiencing an'],
            ['separationfrom', 'separation from'],
            ['fromhome', 'from home'],
            ['aboutbeing', 'about being'],
            ['aboutlosing', 'about losing'],
            ['orin', 'or in'],
            ['topreoccupation', 'to preoccupation'],
            ['aboutseparation', 'about separation'],
            ['scenariosabout', 'scenarios about'],
            ['tovomiting', 'to vomiting'],
            ['frommajor', 'from major'],
            ['nextt', 'next t'],
            ['nextto', 'next to'],
            ['belisted', 'be listed'],
            ['beingseparated', 'being separated'],
            ['leaveor', 'leave or'],
            ['lonelywhen', 'lonely when'],
            ['stayingasleep', 'staying asleep'],
            ['tantrumswhen', 'tantrums when'],
            ['thehouse', 'the house'],
            ['otherforms', 'other forms'],
            ['theloved', 'the loved'],
            ['uncontactable', 'uncontactable'],
            ['separations', 'separations'],
            ['tolet', 'to let'],
            ['toany', 'to any'],
            ['orsafety', 'or safety'],
            ['whereabouts', 'whereabouts'],
            ['inanticipation', 'in anticipation'],
            ['provokingsituations', 'provoking situations'],
            ['orexperiencing', 'or experiencing'],
            ['aboutbeingseparated', 'about being separated'],
            ['beingseparated', 'being separated'],
            ['lonelywhen', 'lonely when'],
            ['topreoccupation', 'to preoccupation'],
            ['aboutseparation', 'about separation'],
            ['scenariosabout', 'scenarios about'],
            ['thehouse', 'the house'],
            ['apartðý', 'apart'],
            ['oneðý', 'one'],
            ['aloneðý', 'alone'],
            ['uncontactableðý', 'uncontactable'],
            ['separationsðý', 'separations'],
            ['controlðý', 'control']
        ];
        
        for (const [wrong, right] of concatenations) {
            text = text.replace(new RegExp(wrong, 'gi'), right);
        }
        
        // Add line breaks after question marks before numbers
        text = text.replace(/\?(\d+\.)/g, '?\n$1');
        
        // Add line breaks in number sequences like "1-2-3-4-5"
        text = text.replace(/(\d)-(\d)-(\d)-(\d)-(\d)/g, '$1\n$2\n$3\n$4\n$5');
        text = text.replace(/(\d)-(\d)-(\d)-(\d)/g, '$1\n$2\n$3\n$4');
        text = text.replace(/(\d)-(\d)-(\d)/g, '$1\n$2\n$3');
        
        // Fix table of contents - add line breaks before page numbers at start
        text = text.replace(/^(\d+)(\d+)(\d+)/m, '$1\n$2\n$3\n');
        
        // Add line breaks before numbered items (1., 2., 3. or 1), 2), 3))
        text = text.replace(/(\S)(\d+[\.\)])\s+/g, '$1\n$2 ');
        
        // Add line breaks before bullet points and checkboxes
        text = text.replace(/(\S)([•\-\*○▪☐☑])\s*/g, '$1\n$2 ');
        
        // Add line breaks before common question patterns
        text = text.replace(/(\S)(Question\s+\d+)/gi, '$1\n\n$2');
        text = text.replace(/(\S)(Q\d+[\.:])/g, '$1\n\n$2');
        
        // Detect and add spacing around ALL CAPS headings (at least 3 chars, max 80 chars)
        text = text.replace(/(\S)([A-Z][A-Z\s]{2,78}[A-Z])(?=[a-z]|\d)/g, '$1\n\n$2\n\n');
        
        // Add line breaks before common section headers
        text = text.replace(/(\S)(Contents|Introduction|Summary|Conclusion|References|Appendix|Self-Assessment|Symptoms|Triggers|Management|Checklist|Inventory|History|Strategies|Practices|Plan|Boundaries|Skills|Styles|Wellness):/gi, '$1\n\n$2:\n');
        
        // Fix section headers followed by numbers
        text = text.replace(/(Checklist|Inventory|History)(\d)/gi, '$1\n$2');
        
        // Add line breaks before "Statement Rate" pattern
        text = text.replace(/(\S)(Statement\s+Rate)/gi, '$1\n\n$2');
        
        // Add line breaks before score patterns
        text = text.replace(/(\S)(Score:)/gi, '$1\n\n$2');
        
        // Add line breaks before "Emotional Symptoms" and similar
        text = text.replace(/(\.)([A-Z][a-z]+\s+Symptoms)/g, '$1\n\n$2');
        
        // Clean up excessive line breaks (max 2)
        text = text.replace(/\n{3,}/g, '\n\n');
        
        return text;
    }
};
