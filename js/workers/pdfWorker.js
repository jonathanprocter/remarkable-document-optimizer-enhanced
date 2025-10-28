// PDF Worker
// Background processing for PDF operations to prevent UI blocking

// Import PDF.js in worker context
importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');

self.addEventListener('message', async function(e) {
    const { type, data } = e.data;
    
    try {
        switch (type) {
            case 'parse':
                await parsePDF(data);
                break;
            case 'extractPage':
                await extractPage(data);
                break;
            case 'generateThumbnails':
                await generateThumbnails(data);
                break;
            default:
                throw new Error('Unknown worker task: ' + type);
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
});

/**
 * Parse PDF in background
 */
async function parsePDF(data) {
    const { arrayBuffer, options } = data;
    
    self.postMessage({
        type: 'progress',
        stage: 'loading',
        progress: 0
    });
    
    // Load PDF
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    self.postMessage({
        type: 'progress',
        stage: 'extracting',
        progress: 25
    });
    
    let fullText = '';
    const pages = [];
    
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract text with formatting
        const pageText = extractTextWithFormatting(textContent.items);
        fullText += pageText + '\\n\\n';
        
        pages.push({
            pageNum: i,
            text: pageText
        });
        
        // Report progress
        const progress = 25 + (i / pdf.numPages) * 50;
        self.postMessage({
            type: 'progress',
            stage: 'extracting',
            progress: progress,
            currentPage: i,
            totalPages: pdf.numPages
        });
    }
    
    self.postMessage({
        type: 'complete',
        result: {
            text: fullText,
            pages: pages,
            pageCount: pdf.numPages
        }
    });
}

/**
 * Extract text with formatting (same logic as main thread)
 */
function extractTextWithFormatting(items) {
    if (!items || items.length === 0) return '';
    
    let text = '';
    let lastY = null;
    let lastX = null;
    let lastHeight = null;
    let lastItem = null;
    
    const sortedItems = items.slice().sort((a, b) => {
        const yDiff = Math.abs(a.transform[5] - b.transform[5]);
        if (yDiff > 2) {
            return b.transform[5] - a.transform[5];
        }
        return a.transform[4] - b.transform[4];
    });
    
    for (const item of sortedItems) {
        if (!item.str) continue;
        
        const y = item.transform[5];
        const x = item.transform[4];
        const height = item.height || 12;
        
        if (lastY !== null) {
            const yDiff = Math.abs(y - lastY);
            const avgHeight = lastHeight ? (height + lastHeight) / 2 : height;
            
            if (yDiff > avgHeight * 0.3) {
                if (yDiff > avgHeight * 1.5) {
                    text += '\\n\\n';
                } else {
                    text += '\\n';
                }
            } else if (lastX !== null && x < lastX - 50) {
                text += '\\n';
            }
        }
        
        const itemStr = item.str.trim();
        if (itemStr) {
            const needsSpace = text.length > 0 && 
                               !text.endsWith('\\n') && 
                               !text.endsWith(' ');
            
            if (needsSpace) {
                let shouldAddSpace = false;
                
                if (item.str.startsWith(' ') || (lastItem && lastItem.str.endsWith(' '))) {
                    shouldAddSpace = true;
                }
                else if (lastItem && lastItem.hasEOL) {
                    shouldAddSpace = true;
                }
                else if (lastX !== null && lastItem) {
                    const gap = x - lastX;
                    if (gap > 2) {
                        shouldAddSpace = true;
                    }
                }
                
                if (!shouldAddSpace && text.length > 0 && !text.endsWith('-')) {
                    const lastChar = text[text.length - 1];
                    const firstChar = itemStr[0];
                    if (/[a-zA-Z0-9]/.test(lastChar) && /[a-zA-Z0-9]/.test(firstChar)) {
                        shouldAddSpace = true;
                    }
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
}

/**
 * Extract single page
 */
async function extractPage(data) {
    const { arrayBuffer, pageNum } = data;
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const pageText = extractTextWithFormatting(textContent.items);
    
    self.postMessage({
        type: 'pageComplete',
        result: {
            pageNum: pageNum,
            text: pageText
        }
    });
}

/**
 * Generate thumbnails for all pages
 */
async function generateThumbnails(data) {
    const { arrayBuffer, scale = 0.2 } = data;
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const thumbnails = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: scale });
        
        // Create offscreen canvas
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // Convert to blob
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
        
        thumbnails.push({
            pageNum: i,
            blob: blob
        });
        
        // Report progress
        self.postMessage({
            type: 'thumbnailProgress',
            currentPage: i,
            totalPages: pdf.numPages
        });
    }
    
    self.postMessage({
        type: 'thumbnailsComplete',
        result: thumbnails
    });
}
