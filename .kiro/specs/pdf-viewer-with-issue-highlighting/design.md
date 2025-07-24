# Design Document

## Overview

The PDF viewer with issue highlighting feature will create a React component that displays PDF documents using the existing `react-pdf` library and provides text highlighting capabilities using `react-pdf-highlighter`. The component will integrate with the current document analysis system to allow users to click on issues and automatically navigate to and highlight the corresponding text in the PDF.

## Architecture

### Component Structure

```
PdfViewer (Main Component)
├── PdfDocument (react-pdf Document wrapper)
├── PdfPage (react-pdf Page wrapper)
├── PdfControls (Navigation controls)
├── PdfHighlighter (Text highlighting logic)
└── PdfErrorBoundary (Error handling)
```

### Data Flow

1. **Issue Selection**: User clicks an issue in the issues list
2. **Text Location**: Component uses issue.offsetStart/offsetEnd or issue.originalText to locate text
3. **Page Navigation**: Component calculates which page contains the text
4. **Highlighting**: Component applies highlight styling to the located text
5. **Scroll**: Component scrolls to the highlighted text position

## Components and Interfaces

### PdfViewer Component

**Props Interface:**
```typescript
interface PdfViewerProps {
  documentUrl: string;
  selectedIssue?: Issue | null;
  onIssueHighlight?: (issue: Issue, success: boolean) => void;
  className?: string;
}

interface Issue {
  _id: string;
  originalText: string;
  offsetStart?: number;
  offsetEnd?: number;
  severity: string;
  type: string;
}
```

**State Management:**
```typescript
interface PdfViewerState {
  numPages: number;
  currentPage: number;
  scale: number;
  isLoading: boolean;
  error: string | null;
  textContent: string;
  highlights: Highlight[];
}

interface Highlight {
  id: string;
  startOffset: number;
  endOffset: number;
  page: number;
  color: string;
}
```

### PdfControls Component

**Features:**
- Previous/Next page navigation
- Page number input
- Zoom in/out controls
- Scale display

### PdfHighlighter Component

**Responsibilities:**
- Text search and location within PDF content
- Highlight creation and management
- Scroll-to-highlight functionality
- Highlight styling based on issue severity

## Data Models

### Highlight Data Structure

```typescript
interface PdfHighlight {
  id: string;
  issueId: string;
  startOffset: number;
  endOffset: number;
  pageNumber: number;
  boundingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

### Text Location Algorithm

1. **Offset-based Location** (Primary):
   - Use `issue.offsetStart` and `issue.offsetEnd` if available
   - Extract text content from PDF using pdfjs-dist
   - Calculate page and position based on character offsets

2. **Text Search Fallback** (Secondary):
   - Use `issue.originalText` for fuzzy text matching
   - Search across all pages for matching text
   - Handle partial matches and text variations

## Error Handling

### Error Scenarios

1. **PDF Loading Failures**:
   - Network errors
   - Corrupted PDF files
   - Unsupported PDF formats
   - CORS issues

2. **Text Location Failures**:
   - Invalid offset positions
   - Text not found in PDF
   - OCR-scanned PDFs without text layer

3. **Rendering Issues**:
   - Browser compatibility problems
   - Memory limitations with large PDFs
   - Worker script loading failures

### Error Recovery Strategies

```typescript
interface ErrorHandling {
  pdfLoadError: () => void; // Show fallback download link
  textLocationError: () => void; // Show "text not found" message
  workerError: () => void; // Fallback to basic PDF display
}
```

## Testing Strategy

### Unit Tests

1. **PdfViewer Component**:
   - Props handling and validation
   - State management
   - Event handling

2. **Text Location Logic**:
   - Offset-based text location
   - Fuzzy text search
   - Page calculation

3. **Highlight Management**:
   - Highlight creation and removal
   - Multiple highlight handling
   - Severity-based styling

### Integration Tests

1. **PDF Loading**:
   - Various PDF formats and sizes
   - Network error scenarios
   - Worker script integration

2. **Issue Integration**:
   - Issue selection and highlighting
   - Multiple issue navigation
   - Real document analysis data

### Performance Tests

1. **Large PDF Handling**:
   - Memory usage monitoring
   - Rendering performance
   - Text extraction speed

2. **Multiple Highlights**:
   - Highlight rendering performance
   - Search algorithm efficiency

## Implementation Details

### PDF.js Configuration

```typescript
// PDF worker configuration
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

### Highlight Styling

```css
.pdf-highlight {
  position: absolute;
  pointer-events: none;
  mix-blend-mode: multiply;
}

.pdf-highlight--critical {
  background-color: rgba(255, 0, 0, 0.3);
  border: 2px solid #ff0000;
}

.pdf-highlight--high {
  background-color: rgba(255, 165, 0, 0.3);
  border: 2px solid #ffa500;
}

.pdf-highlight--medium {
  background-color: rgba(255, 255, 0, 0.3);
  border: 2px solid #ffff00;
}

.pdf-highlight--low {
  background-color: rgba(0, 128, 0, 0.3);
  border: 2px solid #008000;
}
```

### Text Search Algorithm

```typescript
interface TextSearchResult {
  found: boolean;
  pageNumber: number;
  position: {
    x: number;
    y: number;
  };
  boundingRect: DOMRect;
}

function searchTextInPdf(
  text: string,
  pdfDocument: PDFDocumentProxy
): Promise<TextSearchResult>
```

### Responsive Design

- **Desktop**: Side-by-side PDF and issues list
- **Tablet**: Stacked layout with collapsible sections
- **Mobile**: Full-screen PDF with overlay controls

### Accessibility Features

- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management for highlights

### Performance Optimizations

1. **Lazy Loading**: Load PDF pages on demand
2. **Virtual Scrolling**: For large documents
3. **Text Caching**: Cache extracted text content
4. **Debounced Search**: Prevent excessive search operations
5. **Memory Management**: Cleanup unused page renders