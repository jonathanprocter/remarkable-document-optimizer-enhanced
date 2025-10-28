# reMarkable Document Optimizer

Convert documents to optimized PDFs for the reMarkable Paper Pro Move (7.3" E Ink tablet)

## 🎯 Overview

This web application converts various document formats into PDFs optimized for the reMarkable Paper Pro Move device's 7.3" Color E Ink display. All processing happens **100% client-side** - your files never leave your device.

### Key Features

- ✅ **Multiple Format Support**: PDF, DOCX, Markdown, CSV, Excel, PowerPoint, EPUB
- 🔍 **OCR Support**: Automatic text extraction from scanned PDFs (NEW in v1.3.0)
- 🔒 **Privacy First**: 100% client-side processing, no server uploads
- 📱 **E Ink Optimized**: Tailored for 7.3" display (1696×954 pixels)
- 🎨 **Smart Contrast**: Adjustable contrast levels for E Ink readability
- 📝 **Improved Word-Wrapping**: Better text rendering at word boundaries (NEW in v1.3.0)
- 👁️ **Live Preview**: See your optimized PDF before downloading
- 🐛 **Debug Console**: Comprehensive logging for troubleshooting

## 🚀 Quick Start

### Option 1: Open Directly

1. Download or clone this repository
2. Open `index.html` in a modern web browser
3. No installation or build process required!

### Option 2: Serve Locally

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx serve

# Then open http://localhost:8000
```

## 📖 How to Use

1. **Upload Document**
   - Click the upload zone or drag & drop your file
   - Supported: PDF, DOCX, MD, CSV, XLSX, PPT, PPTX, EPUB

2. **Configure Options**
   - Page Size: reMarkable (default), A4, or Letter
   - Font Size: 10-16pt (12pt recommended)
   - Contrast: Low, Medium (recommended), or High
   - Image Optimization: Enable for better E Ink display

3. **Process**
   - Click "Process Document"
   - Watch the progress bar
   - Review the debug console (optional)

4. **Preview & Download**
   - Review the preview
   - Click "Download Optimized PDF"
   - Transfer to your reMarkable device!

## 🛠️ Technical Details

### Architecture

```
index.html          → Main UI interface
├── css/
│   ├── main.css    → Core styles
│   └── components.css → UI components
└── js/
    ├── app.js      → Main controller
    ├── documentParser.js → Format parsing
    ├── pdfOptimizer.js → PDF generation & optimization
    ├── fileHandler.js → Upload & validation
    ├── previewRenderer.js → PDF preview
    └── utils.js    → Helper functions
```

### Dependencies (via CDN)

- **jsPDF** v2.5.1 - PDF generation
- **PDF.js** v3.11.174 - PDF parsing & preview
- **Mammoth.js** v1.6.0 - DOCX parsing
- **PapaParse** v5.4.1 - CSV parsing
- **SheetJS** v0.18.5 - Excel parsing
- **markdown-it** v13.0.2 - Markdown parsing

### Device Specifications

- **Display**: 7.3" Color E Ink (Kaleido 3)
- **Resolution**: 1696×954 pixels
- **Physical Size**: 195.6×107.8mm portrait
- **DPI**: 226
- **Aspect Ratio**: 16:9

## 🔧 Development

### File Structure

```
remarkable-optimizer/
├── index.html              # Main entry point
├── css/
│   ├── main.css           # Application styles
│   └── components.css     # Component styles
├── js/
│   ├── app.js            # Main application controller
│   ├── utils.js          # Utility functions
│   ├── fileHandler.js    # File upload handling
│   ├── documentParser.js # Document parsing
│   ├── pdfOptimizer.js   # PDF optimization
│   └── previewRenderer.js # Preview rendering
└── README.md             # This file
```

### Key Fixes in v1.2.0

This version addresses the **blank PDF issue** identified in the original project:

1. **Content Verification**: Multiple checkpoints ensure content is extracted
2. **Fallback Extraction**: If primary extraction fails, tries alternative methods
3. **Text Sanitization**: Removes control characters and normalizes whitespace
4. **Line Splitting**: Properly breaks text to fit page width
5. **Actual Rendering**: Verifies text is actually written to PDF
6. **Size Validation**: Checks final PDF size to detect empty documents
7. **Comprehensive Logging**: Debug console tracks every step

### Debug Console

The application includes a comprehensive debug console that logs:

- Document parsing progress
- Content extraction verification
- PDF generation steps
- Text rendering operations
- File size validations
- Error messages with context

## 🐛 Troubleshooting

### Blank PDF Output

If you get a blank PDF:

1. Open the Debug Console (expand at bottom of page)
2. Look for "Content text extracted" log
3. Check if `textLength` is > 0
4. If textLength is 0, the document format may not be fully supported

### Unsupported Features

- **PowerPoint**: Limited to text extraction only
- **EPUB**: Basic text extraction only
- **Images in DOCX**: May not preserve complex formatting
- **Complex Tables**: Simplified for E Ink display

### File Size Limits

- Maximum file size: 50MB
- Recommended: Under 10MB for best performance
- Large files may take longer to process

## 📝 Known Limitations

1. **PowerPoint & EPUB**: Limited parsing support (text only)
2. **Complex Formatting**: Simplified for E Ink optimization
3. **Embedded Media**: Videos and audio not supported
4. **Fonts**: Uses standard PDF fonts (no custom font embedding)
5. **Page Numbers**: Not automatically added
6. **Headers/Footers**: Not preserved from originals

## 🔐 Privacy & Security

- **No Server Communication**: All processing happens in your browser
- **No Data Storage**: Files are not saved or cached
- **No Tracking**: No analytics or tracking scripts
- **Local Processing**: Your documents never leave your device

## 🌐 Browser Compatibility

Tested and working on:

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+

Requires modern browser with:
- ES6+ JavaScript support
- Canvas API
- FileReader API
- Blob/ArrayBuffer support

## 📄 License

This project is open source. Feel free to use, modify, and distribute.

## 🙏 Acknowledgments

Built with excellent open-source libraries:
- jsPDF - PDF generation
- PDF.js - PDF rendering (Mozilla)
- Mammoth.js - DOCX conversion
- PapaParse - CSV parsing
- SheetJS - Excel parsing
- markdown-it - Markdown parsing

## 🔄 Version History

### v1.2.0 (Current)
- ✅ Fixed blank PDF generation issue
- ✅ Added comprehensive debugging
- ✅ Improved content extraction
- ✅ Enhanced error handling
- ✅ Added size validation

### v1.1.0
- Added debugging instrumentation
- Improved logging
- Enhanced error messages

### v1.0.0
- Initial release
- Basic document conversion
- E Ink optimization

## 💬 Support

For issues or questions:
1. Check the Debug Console output
2. Review the Known Limitations section
3. Ensure your browser is up to date
4. Try with a simpler document first

## 🚀 Future Enhancements

Potential improvements:
- [ ] Page number insertion
- [ ] Custom header/footer support
- [ ] Batch processing
- [ ] Advanced table formatting
- [ ] Image optimization presets
- [ ] Custom font support
- [ ] OCR for scanned PDFs

---

**Made with ❤️ for reMarkable users**
