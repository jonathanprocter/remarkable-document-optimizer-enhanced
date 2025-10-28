# reMarkable Document Optimizer v2.0 - Enhanced Edition

**Transform any document into a beautifully optimized PDF or EPUB for your reMarkable Paper Pro Move (7.3" E Ink display)**

## 🎉 What's New in v2.0

This enhanced version includes ALL the features you requested:

### ✨ Major Features

1. **Multi-Page Preview with Navigation**
   - View all pages with thumbnail sidebar
   - Zoom controls (fit-width, fit-height, 100%, 150%, 200%)
   - Keyboard navigation (←/→ arrows)
   - Jump to any page instantly

2. **Batch Processing**
   - Upload and process multiple files at once
   - Queue management with progress tracking
   - Download all as ZIP archive
   - Individual or bulk processing

3. **Smart Presets System**
   - Pre-configured presets: Book, Article, Technical, Spreadsheet, Presentation
   - Save custom presets for reuse
   - One-click apply settings
   - Persistent storage

4. **Advanced Formatting Controls**
   - Line spacing (single, 1.15, 1.5, double, custom)
   - Font family (serif, sans-serif, monospace)
   - Text alignment (left, center, right, justify)
   - Custom margins (top, bottom, left, right)
   - Paragraph spacing control

5. **Enhanced OCR with Visual Feedback**
   - Real-time progress tracking
   - Page-by-page processing display
   - Quality settings (fast, balanced, accurate)
   - Multi-language support (10+ languages)
   - Auto-detect scanned PDFs

6. **Document History**
   - Recent documents with thumbnails
   - Quick reprocess with saved settings
   - Storage management
   - Settings restoration

7. **Advanced Image Handling**
   - Processing modes: Original, Grayscale, Black & White, Remove
   - Compression levels: None, Low, Medium, High, Maximum
   - Floyd-Steinberg dithering for E Ink
   - Automatic size optimization

8. **EPUB Export**
   - Generate EPUB3 files optimized for E Ink
   - Preserve formatting and images
   - Compatible with all e-readers
   - Portrait-optimized layout

9. **Accessibility Features**
   - Comprehensive keyboard shortcuts
   - Skip links for navigation
   - High contrast mode (Alt+C)
   - Screen reader support
   - ARIA labels throughout

10. **Performance Optimizations**
    - Web Workers for background processing
    - Non-blocking UI during operations
    - Efficient memory management
    - Faster rendering

## 🎹 Keyboard Shortcuts

### File Operations
- `Ctrl+O` - Open file
- `Ctrl+P` - Process document
- `Ctrl+S` - Download result
- `Ctrl+E` - Export as EPUB

### Navigation
- `←/→` - Previous/Next page
- `Home` - First page
- `End` - Last page

### Zoom
- `+/=` - Zoom in
- `-/_` - Zoom out
- `0` - Reset zoom

### UI Controls
- `Escape` - Close/Cancel
- `Ctrl+H` - Toggle history
- `Ctrl+K` - Show keyboard shortcuts
- `Ctrl+D` - Toggle debug console

### Accessibility
- `Alt+1` - Jump to upload
- `Alt+2` - Jump to options
- `Alt+3` - Jump to preview
- `Alt+C` - Toggle high contrast

## 📱 reMarkable Paper Pro Move Optimization

All features are specifically optimized for the reMarkable Paper Pro Move:

- **Portrait orientation** (107.8mm × 195.6mm)
- **7.3" E Ink display** optimization
- **Touch-friendly** interface
- **E Ink-optimized** image processing
- **Fast page turning** with lightweight PDFs

## 🚀 Quick Start

1. **Open the application** in your web browser
2. **Upload a document** (PDF, DOCX, Markdown, CSV, Excel, PowerPoint, EPUB)
3. **Choose a preset** or customize settings
4. **Process the document**
5. **Preview** with multi-page navigation
6. **Download** as PDF or export as EPUB

## 💾 Browser Storage

The application uses localStorage for:
- Custom presets
- Document history (last 10 documents)
- User preferences (high contrast mode)
- Settings restoration

**Note**: All processing happens client-side. Your files never leave your device.

## 🔧 Advanced Features

### Batch Processing
1. Enable "Batch Mode" toggle
2. Select multiple files
3. Click "Process All"
4. Download individually or as ZIP

### Custom Presets
1. Configure your desired settings
2. Click "Save Custom"
3. Name your preset
4. Apply anytime with one click

### OCR for Scanned PDFs
1. Upload a scanned PDF
2. OCR auto-detects if needed
3. Choose language and quality
4. Process with text extraction

### EPUB Export
1. Process document as usual
2. Click "Export as EPUB"
3. Get E Ink-optimized EPUB3 file
4. Transfer to any e-reader

## 🎨 Customization

### Image Processing Options
- **Original**: Keep images as-is
- **Grayscale**: Convert to grayscale (recommended for E Ink)
- **Black & White**: High contrast with dithering
- **Remove**: Strip all images for text-only

### Compression Levels
- **None**: No compression (largest file)
- **Low**: Minimal compression
- **Medium**: Balanced (recommended)
- **High**: Aggressive compression
- **Maximum**: Smallest file size

## 🐛 Debug Console

Press `Ctrl+D` or expand the debug console to:
- View processing logs
- Track performance
- Diagnose issues
- Monitor memory usage

## 📦 What's Included

- `index.html` - Main application
- `css/` - Stylesheets (main, components, preview, accessibility)
- `js/` - JavaScript modules
  - `modules/` - Enhanced feature modules
  - `workers/` - Web Workers for performance
  - Core processing modules
- Documentation files

## 🔄 Version History

### v2.0.0 - Enhanced Edition
- Multi-page preview with thumbnails
- Batch processing system
- Smart presets and custom profiles
- Enhanced OCR with visual feedback
- Document history
- Advanced image processing
- EPUB export
- Comprehensive keyboard shortcuts
- Accessibility features
- Performance optimizations

### v1.2.1 - Space Extraction Fix
- Fixed PDF text extraction spacing issues

## 📄 License

This is a client-side web application. All processing happens in your browser.
No data is sent to any server.

## 🙏 Credits

Built with:
- PDF.js (Mozilla)
- jsPDF
- Mammoth.js
- PapaParse
- SheetJS
- Tesseract.js
- JSZip

---

**Enjoy your enhanced reMarkable Document Optimizer! 📚✨**
