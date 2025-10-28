# reMarkable Document Optimizer v2.0 - Architecture Plan

## Target Device: reMarkable Paper Pro Move

### Device Specifications
- **Display**: 7.3" E Ink (portrait orientation)
- **Dimensions**: 107.8mm (width) × 195.6mm (height)
- **Orientation**: Portrait (natural reading format)
- **Resolution**: Optimized for E Ink grayscale
- **Touch**: Full touchscreen support

## Enhanced Features

### 1. Multi-Page Preview System
- Thumbnail grid view of all pages
- Full-page preview with navigation (prev/next)
- Zoom controls (fit-to-width, fit-to-height, 100%, 150%, 200%)
- Page counter and jump-to-page
- Side-by-side comparison (before/after)

### 2. Batch Processing
- Multi-file upload (drag & drop zone)
- Processing queue with status indicators
- Individual file progress tracking
- Bulk download as ZIP
- Cancel/retry individual files

### 3. Advanced Formatting Controls
- **Margins**: Top, bottom, left, right (independent)
- **Line spacing**: Single, 1.15, 1.5, Double, Custom
- **Font family**: Serif, Sans-serif, Monospace
- **Font size**: 8pt - 20pt (optimized presets)
- **Text alignment**: Left, Center, Right, Justify
- **Paragraph spacing**: Custom control

### 4. Smart Presets System
- **Book/Novel**: Optimized for long-form reading
- **Article/Paper**: Academic document formatting
- **Technical Doc**: Code-friendly monospace
- **Spreadsheet**: Compact layout for data
- **Presentation**: Large text, high contrast
- **Custom**: Save user-defined presets (localStorage)

### 5. Enhanced OCR
- Real-time progress bar with page numbers
- Visual feedback (processing animation)
- Confidence score display
- Language selection (English, Spanish, French, German, etc.)
- OCR quality settings (fast/balanced/accurate)

### 6. Document History
- Last 10 processed documents (localStorage)
- Thumbnail preview
- Settings used for each
- Quick re-process button
- Clear history option

### 7. Advanced Image Controls
- **Compression**: None, Low, Medium, High, Maximum
- **Processing**: Keep original, Grayscale, Black & White, Remove
- **Dithering**: Floyd-Steinberg for E Ink optimization
- **Resize**: Fit to page width, custom percentage
- **Quality**: 10-100% slider

### 8. EPUB Export
- Generate EPUB3 format
- E Ink optimized styling
- Proper metadata (title, author)
- Table of contents generation
- Reflowable text for e-readers
- Embedded fonts option

### 9. Accessibility Features
- **Keyboard shortcuts**:
  - `Ctrl+O`: Open file
  - `Ctrl+P`: Process document
  - `Ctrl+S`: Download result
  - `Ctrl+Z`: Undo/reset
  - `Arrow keys`: Navigate preview pages
  - `+/-`: Zoom in/out
- **Screen reader support**: ARIA labels
- **High contrast mode**: Toggle
- **Large touch targets**: 44px minimum
- **Focus indicators**: Clear visual feedback

### 10. Performance Optimizations
- **Web Worker**: Offload PDF processing to background thread
- **Progressive rendering**: Show pages as they're processed
- **Memory management**: Process in chunks for large files
- **Lazy loading**: Load preview images on demand
- **Caching**: Cache processed pages

## Technical Stack

### Core Libraries
- **PDF.js**: PDF parsing and rendering
- **jsPDF**: PDF generation
- **Tesseract.js**: OCR processing
- **JSZip**: Batch file packaging
- **epub-gen**: EPUB generation
- **Mammoth.js**: DOCX parsing
- **PapaParse**: CSV parsing
- **SheetJS**: Excel parsing
- **markdown-it**: Markdown parsing

### Architecture Patterns
- **Module pattern**: Separate concerns into modules
- **Event-driven**: Custom events for communication
- **State management**: Centralized app state
- **Worker threads**: Background processing
- **LocalStorage**: Persistent user data

## File Structure

```
remarkable-enhanced/
├── index.html                 # Main application
├── css/
│   ├── main.css              # Core styles
│   ├── components.css        # UI components
│   ├── preview.css           # Preview system
│   └── accessibility.css     # A11y styles
├── js/
│   ├── app.js                # Main application controller
│   ├── modules/
│   │   ├── documentParser.js     # Parse documents (FIXED)
│   │   ├── pdfOptimizer.js       # PDF generation
│   │   ├── epubGenerator.js      # EPUB export
│   │   ├── previewManager.js     # Multi-page preview
│   │   ├── batchProcessor.js     # Batch processing
│   │   ├── presetManager.js      # Smart presets
│   │   ├── historyManager.js     # Document history
│   │   ├── imageProcessor.js     # Image optimization
│   │   ├── ocrManager.js         # Enhanced OCR
│   │   ├── keyboardHandler.js    # Keyboard shortcuts
│   │   └── stateManager.js       # App state
│   ├── workers/
│   │   └── pdfWorker.js          # Background processing
│   └── utils.js              # Utility functions
├── assets/
│   └── icons/                # UI icons
└── docs/
    ├── ARCHITECTURE.md       # This file
    └── USER_GUIDE.md         # User documentation
```

## Implementation Priority

1. ✓ Fix space extraction (COMPLETED)
2. Multi-page preview system
3. Batch processing
4. Advanced formatting controls
5. Smart presets
6. Enhanced OCR feedback
7. Document history
8. Image controls
9. EPUB export
10. Accessibility features
11. Performance optimizations
12. Testing and deployment

## reMarkable Pro Move Optimizations

- Portrait-first design
- E Ink contrast optimization (no colors)
- Touch-friendly UI (44px+ targets)
- Lightweight PDFs for fast page turns
- Optimized file sizes for device storage
- Grayscale image processing
- Clear typography for E Ink clarity
