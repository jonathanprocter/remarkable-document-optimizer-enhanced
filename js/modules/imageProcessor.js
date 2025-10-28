// Image Processor Module
// Advanced image handling optimized for E Ink displays

const ImageProcessor = {
    /**
     * Process image for E Ink display
     */
    async processImage(imageData, options = {}) {
        const {
            processing = 'grayscale', // 'original', 'grayscale', 'blackwhite', 'remove'
            compression = 'medium',    // 'none', 'low', 'medium', 'high', 'maximum'
            dithering = true,
            maxWidth = null,
            quality = 0.8
        } = options;
        
        Utils.debug.log('Processing image', { processing, compression });
        
        if (processing === 'remove') {
            return null;
        }
        
        try {
            // Create image element
            const img = await this.loadImage(imageData);
            
            // Create canvas
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Resize if needed
            if (maxWidth && width > maxWidth) {
                const scale = maxWidth / width;
                width = maxWidth;
                height = height * scale;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // Draw image
            ctx.drawImage(img, 0, 0, width, height);
            
            // Get image data
            const imgData = ctx.getImageData(0, 0, width, height);
            
            // Apply processing
            switch (processing) {
                case 'grayscale':
                    this.applyGrayscale(imgData);
                    break;
                case 'blackwhite':
                    this.applyBlackAndWhite(imgData, dithering);
                    break;
                case 'original':
                default:
                    // Keep original but still optimize
                    break;
            }
            
            // Put processed data back
            ctx.putImageData(imgData, 0, 0);
            
            // Apply compression and return
            return this.compressImage(canvas, compression, quality);
            
        } catch (error) {
            Utils.debug.error('Image processing failed', error);
            return imageData; // Return original on error
        }
    },
    
    /**
     * Load image from data URL or blob
     */
    loadImage(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = imageData;
        });
    },
    
    /**
     * Apply grayscale conversion
     */
    applyGrayscale(imageData) {
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // Use luminance formula for better grayscale
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = gray;     // R
            data[i + 1] = gray; // G
            data[i + 2] = gray; // B
            // Alpha (i + 3) stays the same
        }
    },
    
    /**
     * Apply black and white conversion with optional dithering
     */
    applyBlackAndWhite(imageData, useDithering = true) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        if (useDithering) {
            // Floyd-Steinberg dithering for better E Ink results
            this.applyFloydSteinbergDithering(imageData);
        } else {
            // Simple thresholding
            const threshold = 128;
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const bw = gray > threshold ? 255 : 0;
                data[i] = bw;
                data[i + 1] = bw;
                data[i + 2] = bw;
            }
        }
    },
    
    /**
     * Apply Floyd-Steinberg dithering algorithm
     * Optimized for E Ink displays
     */
    applyFloydSteinbergDithering(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Convert to grayscale first
        const grayscale = new Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            grayscale[i / 4] = gray;
        }
        
        // Apply dithering
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const oldPixel = grayscale[idx];
                const newPixel = oldPixel > 128 ? 255 : 0;
                grayscale[idx] = newPixel;
                
                const error = oldPixel - newPixel;
                
                // Distribute error to neighboring pixels
                if (x + 1 < width) {
                    grayscale[idx + 1] += error * 7 / 16;
                }
                if (y + 1 < height) {
                    if (x > 0) {
                        grayscale[idx + width - 1] += error * 3 / 16;
                    }
                    grayscale[idx + width] += error * 5 / 16;
                    if (x + 1 < width) {
                        grayscale[idx + width + 1] += error * 1 / 16;
                    }
                }
            }
        }
        
        // Write back to image data
        for (let i = 0; i < grayscale.length; i++) {
            const value = Math.max(0, Math.min(255, grayscale[i]));
            data[i * 4] = value;
            data[i * 4 + 1] = value;
            data[i * 4 + 2] = value;
        }
    },
    
    /**
     * Compress image based on compression level
     */
    compressImage(canvas, compression, baseQuality = 0.8) {
        const qualityMap = {
            none: 1.0,
            low: 0.9,
            medium: 0.7,
            high: 0.5,
            maximum: 0.3
        };
        
        const quality = qualityMap[compression] || baseQuality;
        
        // Use JPEG for better compression
        return canvas.toDataURL('image/jpeg', quality);
    },
    
    /**
     * Optimize image dimensions for reMarkable
     */
    calculateOptimalDimensions(originalWidth, originalHeight, maxWidth = 550) {
        // reMarkable Paper Pro Move content width is approximately 550px at 100% scale
        
        if (originalWidth <= maxWidth) {
            return { width: originalWidth, height: originalHeight };
        }
        
        const scale = maxWidth / originalWidth;
        return {
            width: maxWidth,
            height: Math.round(originalHeight * scale)
        };
    },
    
    /**
     * Batch process multiple images
     */
    async processImages(images, options = {}) {
        Utils.debug.log('Batch processing images', { count: images.length });
        
        const processed = [];
        
        for (let i = 0; i < images.length; i++) {
            try {
                const result = await this.processImage(images[i], options);
                if (result) {
                    processed.push(result);
                }
                
                // Update progress if callback provided
                if (options.onProgress) {
                    options.onProgress(i + 1, images.length);
                }
            } catch (error) {
                Utils.debug.error(`Failed to process image ${i}`, error);
            }
        }
        
        Utils.debug.success('Batch image processing complete', { 
            total: images.length,
            processed: processed.length
        });
        
        return processed;
    },
    
    /**
     * Get image file size estimate
     */
    getImageSize(dataURL) {
        // Remove data URL prefix
        const base64 = dataURL.split(',')[1];
        // Calculate size in bytes (base64 is ~33% larger than binary)
        const bytes = (base64.length * 3) / 4;
        return bytes;
    },
    
    /**
     * Compare image sizes before/after processing
     */
    compareImageSizes(originalDataURL, processedDataURL) {
        const originalSize = this.getImageSize(originalDataURL);
        const processedSize = this.getImageSize(processedDataURL);
        const reduction = ((originalSize - processedSize) / originalSize * 100).toFixed(1);
        
        return {
            originalSize: originalSize,
            processedSize: processedSize,
            reduction: reduction,
            originalSizeKB: (originalSize / 1024).toFixed(2),
            processedSizeKB: (processedSize / 1024).toFixed(2)
        };
    }
};
