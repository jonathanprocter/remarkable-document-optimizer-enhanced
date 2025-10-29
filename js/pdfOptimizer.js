// PDF Optimizer Module
// Optimizes documents for reMarkable Paper Pro Move E Ink display
// FIXED: Now supports image embedding and improved text rendering

const PDFOptimizer = {
    /**
     * Generate optimized PDF from parsed document
     */
    async generatePDF(parsedDocument, options = {}) {
        Utils.debug.log('PDFOptimizer.generatePDF() called', { 
            documentType: parsedDocument.type,
            hasContent: !!parsedDocument.content,
            contentLength: parsedDocument.content?.length || 0,
            imageCount: parsedDocument.images?.length || 0,
            options: options 
        });

        // CRITICAL CHECK #1: Verify we have content
        if (!parsedDocument.content && !parsedDocument.pages) {
            Utils.debug.error('CRITICAL: No content provided to PDF generator');
            throw new Error('No content to generate PDF from');
        }

        try {
            // Get device specifications
            const specs = Utils.getRemarkableSpecs();
            
            // Calculate PDF dimensions based on page size option
            const dimensions = this.calculateDimensions(options.pageSize || 'remarkable', specs);
            Utils.debug.log('PDF dimensions calculated', dimensions);

            // Initialize jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [dimensions.width, dimensions.height]
            });

            Utils.debug.log('jsPDF instance created', { 
                width: dimensions.width, 
                height: dimensions.height 
            });

            // Set font and optimization parameters
            const fontSize = parseInt(options.fontSize) || 12;
            const contrast = options.contrast || 'medium';
            const optimizeImages = options.optimizeImages !== false;
            const includeImages = options.includeImages !== false;

            Utils.debug.log('PDF parameters', { fontSize, contrast, optimizeImages, includeImages });

            // Apply E Ink optimizations
            this.applyEInkOptimizations(doc, contrast);

            // IMPROVED: Render content with images
            await this.renderContent(doc, parsedDocument, {
                fontSize: fontSize,
                dimensions: dimensions,
                contrast: contrast,
                includeImages: includeImages,
                optimizeImages: optimizeImages
            });

            Utils.debug.success('PDF generation complete');

            return doc;
        } catch (error) {
            Utils.debug.error('PDF generation failed', error);
            throw error;
        }
    },

    /**
     * Calculate PDF dimensions based on page size
     */
    calculateDimensions(pageSize, specs) {
        Utils.debug.log('Calculating dimensions for', pageSize);
        
        let width, height;
        
        switch (pageSize) {
            case 'remarkable':
                width = specs.widthMM;
                height = specs.heightMM;
                break;
            case 'a4':
                width = 210;
                height = 297;
                break;
            case 'letter':
                width = 215.9;
                height = 279.4;
                break;
            default:
                width = specs.widthMM;
                height = specs.heightMM;
        }

        return {
            width: width,
            height: height,
            marginX: 10,
            marginY: 10,
            contentWidth: width - 20,
            contentHeight: height - 20
        };
    },

    /**
     * Apply E Ink specific optimizations
     */
    applyEInkOptimizations(doc, contrast) {
        Utils.debug.log('Applying E Ink optimizations', { contrast });

        // Set color based on contrast level
        const colors = {
            low: { r: 60, g: 60, b: 60 },
            medium: { r: 30, g: 30, b: 30 },
            high: { r: 0, g: 0, b: 0 }
        };

        const color = colors[contrast] || colors.medium;
        doc.setTextColor(color.r, color.g, color.b);

        Utils.debug.log('Text color set', color);
    },

    /**
     * IMPROVED: Render content to PDF with text and images
     */
    async renderContent(doc, parsedDocument, options) {
        Utils.debug.log('renderContent() called', {
            documentType: parsedDocument.type,
            hasContent: !!parsedDocument.content,
            contentLength: parsedDocument.content?.length || 0,
            imageCount: parsedDocument.images?.length || 0
        });

        // Set font size
        doc.setFontSize(options.fontSize);
        
        // Get dimensions
        const { marginX, marginY, contentWidth, contentHeight, width, height } = options.dimensions;
        
        // Get content text
        let contentText = parsedDocument.content || '';
        
        Utils.debug.log('Content text extracted', { 
            textLength: contentText.length,
            firstChars: contentText.substring(0, 100)
        });

        // CRITICAL CHECK: Verify we have actual text
        if (!contentText || contentText.trim().length === 0) {
            Utils.debug.error('CRITICAL: Content text is empty after extraction');

            // Fallback: Try to extract from pages if available
            if (parsedDocument.pages && parsedDocument.pages.length > 0) {
                Utils.debug.log('Attempting to extract from pages array');
                contentText = parsedDocument.pages.map(p => p.text).join('\n\n');
                Utils.debug.log('Extracted from pages', { textLength: contentText.length });
            }

            // Final check
            if (!contentText || contentText.trim().length === 0) {
                Utils.debug.error('CRITICAL: Still no content after fallback attempts');
                throw new Error('No text content could be extracted from document');
            }
        }

        // Text is already sanitized and formatted in documentParser.js
        // No need to sanitize again - this would destroy formatting!
        Utils.debug.log('Using pre-formatted text', { finalLength: contentText.length });

        // Split text into lines that fit on page
        const lines = this.splitTextIntoLines(doc, contentText, contentWidth);
        Utils.debug.success('Text split into lines', { lineCount: lines.length });

        // Render lines with pagination and image insertion
        let currentY = marginY;
        let currentPage = 1;
        let linesOnPage = 0;
        const lineHeight = options.fontSize * 0.4;

        Utils.debug.log('Starting text rendering', { 
            startY: currentY, 
            marginX: marginX,
            lineCount: lines.length 
        });

        // NEW: Track images and their positions
        const images = parsedDocument.images || [];
        let imageIndex = 0;
        const imagesPerPage = Math.floor(contentHeight / 80); // Rough estimate

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Handle empty lines - add spacing but don't render text
            if (!line || line.trim().length === 0) {
                // Use half line height for blank lines to create proper paragraph spacing
                currentY += lineHeight * 0.8;
                continue;
            }

            // Check if we need a new page
            if (currentY + options.fontSize > marginY + contentHeight) {
                Utils.debug.log('Adding new page', { currentPage: currentPage, linesOnPage: linesOnPage });

                // NEW: Add images to page before moving to next
                if (options.includeImages && images.length > 0 && imageIndex < images.length) {
                    await this.insertImagesOnPage(doc, images, imageIndex, imagesPerPage, {
                        marginX, marginY, contentWidth, contentHeight, width, height
                    }, options);
                    imageIndex += imagesPerPage;
                }

                doc.addPage();
                currentPage++;
                currentY = marginY;
                linesOnPage = 0;
            }

            // Render the text to PDF
            try {
                doc.text(line, marginX, currentY);
                linesOnPage++;

                // Debug every 50 lines
                if (i % 50 === 0) {
                    Utils.debug.log(`Rendered ${i + 1}/${lines.length} lines`, {
                        currentPage: currentPage,
                        currentY: currentY
                    });
                }
            } catch (error) {
                Utils.debug.error(`Failed to render line ${i}`, { line: line, error: error });
            }

            // Move to next line
            currentY += lineHeight;
        }

        // NEW: Add remaining images at the end
        if (options.includeImages && images.length > 0 && imageIndex < images.length) {
            Utils.debug.log('Adding remaining images', { 
                remaining: images.length - imageIndex,
                totalImages: images.length
            });
            
            for (let i = imageIndex; i < images.length; i++) {
                // Check if we need a new page for image
                if (currentY + 80 > marginY + contentHeight) {
                    doc.addPage();
                    currentPage++;
                    currentY = marginY;
                }
                
                await this.insertImage(doc, images[i], marginX, currentY, contentWidth, options);
                currentY += 80 + 10; // Image height + spacing
            }
        }

        Utils.debug.success('Content rendering complete', { 
            totalPages: currentPage,
            totalLines: lines.length,
            totalImages: images.length,
            imagesInserted: imageIndex
        });

        // CRITICAL VERIFICATION: Check actual PDF byte size
        // Use arraybuffer to get true byte count, not base64 string length
        const pdfArrayBuffer = doc.output('arraybuffer');
        const actualBytes = pdfArrayBuffer.byteLength;
        
        if (actualBytes < 5000) {
            Utils.debug.warn('PDF seems unusually small', { 
                size: actualBytes,
                note: 'This might indicate rendering issues'
            });
        }

        Utils.debug.log('PDF output size', { 
            bytes: actualBytes,
            formatted: Utils.formatFileSize(actualBytes)
        });
    },

    /**
     * NEW: Insert images on a page
     */
    async insertImagesOnPage(doc, images, startIndex, count, dimensions, options) {
        const { marginX, marginY, contentWidth, contentHeight } = dimensions;
        const maxImages = Math.min(count, images.length - startIndex);
        
        let yOffset = marginY + contentHeight - 100; // Start from bottom
        
        for (let i = 0; i < maxImages && (startIndex + i) < images.length; i++) {
            const image = images[startIndex + i];
            
            try {
                await this.insertImage(doc, image, marginX, yOffset, contentWidth, options);
                yOffset -= 90; // Move up for next image
            } catch (error) {
                Utils.debug.error(`Failed to insert image ${i}`, error);
            }
        }
    },

    /**
     * NEW: Insert a single image into the PDF
     */
    async insertImage(doc, image, x, y, maxWidth, options) {
        try {
            // Calculate image dimensions to fit within page
            const aspectRatio = image.width / image.height;
            let imgWidth = Math.min(maxWidth, image.width / 4); // Scale down
            let imgHeight = imgWidth / aspectRatio;
            
            // Limit height
            if (imgHeight > 80) {
                imgHeight = 80;
                imgWidth = imgHeight * aspectRatio;
            }
            
            // Apply E Ink optimization if requested
            let imageData = image.data;
            if (options.optimizeImages) {
                imageData = await this.optimizeImageForEInk(image.data);
            }
            
            // Add image to PDF
            doc.addImage(imageData, 'PNG', x, y, imgWidth, imgHeight);
            
            Utils.debug.log('Image inserted', {
                page: image.page,
                width: imgWidth,
                height: imgHeight,
                x: x,
                y: y
            });
            
        } catch (error) {
            Utils.debug.error('Failed to insert image', error);
        }
    },

    /**
     * NEW: Optimize image for E Ink display
     */
    async optimizeImageForEInk(imageDataUrl) {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw original image
                    ctx.drawImage(img, 0, 0);
                    
                    // Get image data
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    
                    // Convert to grayscale and increase contrast for E Ink
                    for (let i = 0; i < data.length; i += 4) {
                        // Convert to grayscale
                        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                        
                        // Increase contrast - make darks darker and lights lighter
                        const contrast = 1.5;
                        let adjusted = ((gray / 255 - 0.5) * contrast + 0.5) * 255;
                        adjusted = Math.max(0, Math.min(255, adjusted));
                        
                        // Apply dithering for better E Ink display
                        const threshold = 128;
                        const dithered = adjusted > threshold ? 255 : 0;
                        
                        data[i] = dithered;
                        data[i + 1] = dithered;
                        data[i + 2] = dithered;
                        // Alpha stays the same
                    }
                    
                    ctx.putImageData(imageData, 0, 0);
                    
                    // Convert back to data URL
                    const optimizedDataUrl = canvas.toDataURL('image/png');
                    
                    // Clean up
                    canvas.width = 0;
                    canvas.height = 0;
                    
                    resolve(optimizedDataUrl);
                };
                
                img.onerror = () => {
                    reject(new Error('Failed to load image for optimization'));
                };
                
                img.src = imageDataUrl;
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Split text into lines that fit within page width
     */
    splitTextIntoLines(doc, text, maxWidth) {
        Utils.debug.log('Splitting text into lines', { 
            textLength: text.length, 
            maxWidth: maxWidth 
        });

        const lines = this.wrapTextToLines(doc, text, maxWidth, doc.getFontSize());

        Utils.debug.success('Lines created', { 
            lineCount: lines.length,
            sampleLines: lines.slice(0, 3)
        });

        return lines;
    },

    /**
     * Get PDF as Blob - FIXED to use arraybuffer for accurate size
     */
    async getPDFBlob(doc) {
        Utils.debug.log('Converting PDF to Blob');
        
        // Use arraybuffer for accurate byte representation
        const pdfArrayBuffer = doc.output('arraybuffer');
        
        // Create blob from arraybuffer
        const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
        
        Utils.debug.success('PDF Blob created', { 
            size: pdfBlob.size,
            type: pdfBlob.type,
            formatted: Utils.formatFileSize(pdfBlob.size)
        });

        // CRITICAL VERIFICATION
        if (pdfBlob.size < 1000) {
            Utils.debug.error('CRITICAL: PDF Blob is suspiciously small', { 
                size: pdfBlob.size,
                warning: 'This might be a blank or empty PDF'
            });
        }
        
        // VERIFICATION: Ensure arraybuffer and blob sizes match
        if (pdfArrayBuffer.byteLength !== pdfBlob.size) {
            Utils.debug.error('SIZE MISMATCH', {
                arrayBufferSize: pdfArrayBuffer.byteLength,
                blobSize: pdfBlob.size,
                difference: Math.abs(pdfArrayBuffer.byteLength - pdfBlob.size)
            });
        }

        return pdfBlob;
    },

    /**
     * Download PDF file
     */
    downloadPDF(doc, filename) {
        Utils.debug.log('Downloading PDF', { filename });
        
        const sanitizedFilename = filename.replace(/[^a-z0-9_\-\.]/gi, '_') + '_optimized.pdf';
        doc.save(sanitizedFilename);
        
        Utils.debug.success('PDF download initiated', { filename: sanitizedFilename });
    },

    /**
     * Wrap text to lines with proper word boundaries
     * IMPROVED: Preserves both single and double line breaks
     */
    wrapTextToLines: function(pdf, text, maxWidth, fontSize) {
        Utils.debug.log('Wrapping text to lines', {
            textLength: text.length,
            maxWidth: maxWidth
        });

        // First split by double newlines (paragraph breaks)
        const paragraphs = text.split(/\n\n/);
        const allLines = [];

        for (let p = 0; p < paragraphs.length; p++) {
            const paragraph = paragraphs[p];

            if (!paragraph.trim()) {
                allLines.push('');
                continue;
            }

            // Within each paragraph, split by single newlines (line breaks)
            const lines = paragraph.split(/\n/);

            for (const line of lines) {
                if (!line.trim()) {
                    allLines.push('');
                    continue;
                }

                // Split line into words and wrap if needed
                const words = line.trim().split(/\s+/);
                let currentLine = '';

                for (const word of words) {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
                    const lineWidth = pdf.getTextWidth(testLine);

                    if (lineWidth <= maxWidth) {
                        currentLine = testLine;
                    } else {
                        if (currentLine) {
                            allLines.push(currentLine);
                            currentLine = word;
                        } else {
                            // Single word is too long
                            const brokenWords = this.breakLongWord(pdf, word, maxWidth);
                            allLines.push(...brokenWords.slice(0, -1));
                            currentLine = brokenWords[brokenWords.length - 1];
                        }
                    }
                }

                if (currentLine) {
                    allLines.push(currentLine);
                }
            }

            // Add blank line between paragraphs (but not after the last one)
            if (p < paragraphs.length - 1) {
                allLines.push('');
            }
        }

        return allLines;
    },

    /**
     * Break a long word that doesn't fit on a line
     */
    breakLongWord: function(pdf, word, maxWidth) {
        const lines = [];
        let currentPart = '';

        // Only break if word is ACTUALLY too long (not just missing spaces)
        // Check if the word is genuinely a single long word or concatenated words
        const wordWidth = pdf.getTextWidth(word);
        if (wordWidth <= maxWidth) {
            // Word fits, don't break it
            return [word];
        }

        // Word is genuinely too long, break it intelligently
        for (const char of word) {
            const testPart = currentPart + char;
            if (pdf.getTextWidth(testPart) <= maxWidth) {
                currentPart = testPart;
            } else {
                if (currentPart) {
                    lines.push(currentPart + '-');
                }
                currentPart = char;
            }
        }

        if (currentPart) {
            lines.push(currentPart);
        }

        return lines.length > 0 ? lines : [word];
    },

    /**
     * Clean text - remove problematic characters
     */
    cleanText: function(text) {
        if (!text) return '';
        
        // Remove control characters except newlines and tabs
        text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
        
        // Normalize whitespace
        text = text.replace(/\r\n/g, '\n');
        text = text.replace(/\r/g, '\n');
        text = text.replace(/\t/g, '    ');
        
        // Remove excessive blank lines
        text = text.replace(/\n{3,}/g, '\n\n');
        
        // Remove zero-width characters
        text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        // Normalize spaces
        text = text.replace(/[ \t]+/g, ' ');
        
        // Trim each line
        text = text.split('\n').map(line => line.trim()).join('\n');
        
        return text.trim();
    },
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFOptimizer;
}
