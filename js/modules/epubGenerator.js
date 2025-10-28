// EPUB Generator Module
// Generate EPUB3 files optimized for E Ink readers

const EPUBGenerator = {
    /**
     * Generate EPUB from parsed document
     */
    async generateEPUB(parsedDocument, options = {}) {
        Utils.debug.log('EPUBGenerator.generateEPUB() called', {
            documentType: parsedDocument.type,
            contentLength: parsedDocument.content?.length || 0
        });
        
        const {
            title = 'Untitled Document',
            author = 'Unknown',
            language = 'en',
            fontSize = '12pt',
            fontFamily = 'serif',
            lineHeight = '1.5',
            includeImages = true
        } = options;
        
        try {
            // Prepare content
            const content = this.prepareContent(parsedDocument, options);
            
            // Create EPUB structure
            const epub = await this.createEPUBStructure(title, author, language, content, options);
            
            Utils.debug.success('EPUB generation complete');
            return epub;
            
        } catch (error) {
            Utils.debug.error('EPUB generation failed', error);
            throw error;
        }
    },
    
    /**
     * Prepare content for EPUB
     */
    prepareContent(parsedDocument, options) {
        let content = parsedDocument.content || '';
        const images = parsedDocument.images || [];
        
        // Convert to HTML
        let html = this.convertToHTML(content);
        
        // Add images if included
        if (options.includeImages && images.length > 0) {
            html = this.embedImages(html, images);
        }
        
        return html;
    },
    
    /**
     * Convert plain text to HTML
     */
    convertToHTML(text) {
        // Split into paragraphs
        const paragraphs = text.split(/\n\n+/);
        
        let html = '';
        for (const para of paragraphs) {
            if (para.trim()) {
                // Check if it looks like a heading
                if (this.isHeading(para)) {
                    const level = this.getHeadingLevel(para);
                    html += `<h${level}>${this.escapeHTML(para.trim())}</h${level}>\n`;
                } else {
                    html += `<p>${this.escapeHTML(para.trim()).replace(/\n/g, '<br/>')}</p>\n`;
                }
            }
        }
        
        return html;
    },
    
    /**
     * Check if text looks like a heading
     */
    isHeading(text) {
        const trimmed = text.trim();
        // Short lines (< 60 chars) that don't end with punctuation
        return trimmed.length < 60 && !/[.!?,;:]$/.test(trimmed) && /^[A-Z]/.test(trimmed);
    },
    
    /**
     * Get heading level based on text characteristics
     */
    getHeadingLevel(text) {
        const trimmed = text.trim();
        // Very short = h1, medium = h2, longer = h3
        if (trimmed.length < 20) return 1;
        if (trimmed.length < 40) return 2;
        return 3;
    },
    
    /**
     * Escape HTML special characters
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Embed images in HTML
     */
    embedImages(html, images) {
        // Add images at the end of content
        let imageHTML = '<div class="images">\n';
        
        images.forEach((img, index) => {
            imageHTML += `<figure>\n`;
            imageHTML += `  <img src="images/image${index + 1}.jpg" alt="Image ${index + 1}" />\n`;
            imageHTML += `</figure>\n`;
        });
        
        imageHTML += '</div>\n';
        
        return html + imageHTML;
    },
    
    /**
     * Create EPUB structure using JSZip
     */
    async createEPUBStructure(title, author, language, content, options) {
        const zip = new JSZip();
        
        // Add mimetype (must be first, uncompressed)
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
        
        // Add META-INF/container.xml
        zip.folder('META-INF');
        zip.file('META-INF/container.xml', this.getContainerXML());
        
        // Add OEBPS folder
        const oebps = zip.folder('OEBPS');
        
        // Add content.opf
        oebps.file('content.opf', this.getContentOPF(title, author, language, options));
        
        // Add toc.ncx
        oebps.file('toc.ncx', this.getTOCNCX(title, author));
        
        // Add stylesheet
        oebps.file('stylesheet.css', this.getStylesheet(options));
        
        // Add content HTML
        oebps.file('content.xhtml', this.getContentXHTML(title, content));
        
        // Add images if any
        if (options.includeImages && options.images && options.images.length > 0) {
            const imagesFolder = oebps.folder('images');
            options.images.forEach((img, index) => {
                // Convert data URL to blob
                const base64Data = img.split(',')[1];
                imagesFolder.file(`image${index + 1}.jpg`, base64Data, { base64: true });
            });
        }
        
        // Generate EPUB blob
        const blob = await zip.generateAsync({ type: 'blob' });
        
        return blob;
    },
    
    /**
     * Get container.xml content
     */
    getContainerXML() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    },
    
    /**
     * Get content.opf
     */
    getContentOPF(title, author, language, options) {
        const uuid = 'urn:uuid:' + this.generateUUID();
        const date = new Date().toISOString().split('T')[0];
        
        let imageManifest = '';
        let imageSpine = '';
        
        if (options.includeImages && options.images && options.images.length > 0) {
            options.images.forEach((img, index) => {
                imageManifest += `    <item id="image${index + 1}" href="images/image${index + 1}.jpg" media-type="image/jpeg"/>\n`;
            });
        }
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${uuid}</dc:identifier>
    <dc:title>${this.escapeHTML(title)}</dc:title>
    <dc:creator>${this.escapeHTML(author)}</dc:creator>
    <dc:language>${language}</dc:language>
    <dc:date>${date}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  <manifest>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    <item id="stylesheet" href="stylesheet.css" media-type="text/css"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${imageManifest}  </manifest>
  <spine toc="ncx">
    <itemref idref="content"/>
  </spine>
</package>`;
    },
    
    /**
     * Get toc.ncx
     */
    getTOCNCX(title, author) {
        const uuid = this.generateUUID();
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${this.escapeHTML(title)}</text>
  </docTitle>
  <docAuthor>
    <text>${this.escapeHTML(author)}</text>
  </docAuthor>
  <navMap>
    <navPoint id="content" playOrder="1">
      <navLabel>
        <text>Content</text>
      </navLabel>
      <content src="content.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
    },
    
    /**
     * Get stylesheet optimized for E Ink
     */
    getStylesheet(options) {
        const fontSize = options.fontSize || '12pt';
        const fontFamily = options.fontFamily || 'serif';
        const lineHeight = options.lineHeight || '1.5';
        
        return `/* E Ink Optimized Stylesheet */
body {
    font-family: ${fontFamily};
    font-size: ${fontSize};
    line-height: ${lineHeight};
    margin: 1em;
    color: #000;
    background: #fff;
}

h1, h2, h3, h4, h5, h6 {
    font-weight: bold;
    margin-top: 1em;
    margin-bottom: 0.5em;
    page-break-after: avoid;
}

h1 { font-size: 1.8em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.3em; }

p {
    margin: 0.5em 0;
    text-align: justify;
    orphans: 2;
    widows: 2;
}

img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
    page-break-inside: avoid;
}

figure {
    margin: 1em 0;
    page-break-inside: avoid;
}

/* E Ink optimization: no colors, high contrast */
a {
    color: #000;
    text-decoration: underline;
}

code, pre {
    font-family: monospace;
    background: #f0f0f0;
    padding: 0.2em 0.4em;
}

pre {
    padding: 1em;
    overflow-x: auto;
}`;
    },
    
    /**
     * Get content XHTML
     */
    getContentXHTML(title, content) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>${this.escapeHTML(title)}</title>
    <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
    <section epub:type="bodymatter">
        ${content}
    </section>
</body>
</html>`;
    },
    
    /**
     * Generate UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    /**
     * Download EPUB file
     */
    downloadEPUB(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.replace(/\.[^/.]+$/, '') + '.epub';
        a.click();
        URL.revokeObjectURL(url);
        
        Utils.debug.log('EPUB downloaded', { filename: a.download });
    }
};
