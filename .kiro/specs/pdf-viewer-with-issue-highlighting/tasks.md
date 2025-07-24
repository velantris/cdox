# Implementation Plan

- [x] 1. Set up PDF viewer foundation and basic rendering
  - Create the main PdfViewer component with TypeScript interfaces
  - Implement basic PDF document loading using react-pdf
  - Add PDF worker configuration and error boundary
  - Create basic page navigation controls
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implement PDF controls and navigation
  - [x] 2.1 Create PdfControls component with navigation buttons
    - Build previous/next page navigation functionality
    - Add page number display and input field
    - Implement zoom in/out controls with scale display
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 2.2 Add responsive layout integration
    - Implement responsive grid layout that adjusts when PDF viewer is toggled
    - Create mobile-friendly navigation controls
    - Add proper spacing and sizing for different screen sizes
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Implement text location and highlighting system
  - [x] 3.1 Create text extraction and search functionality
    - Build text extraction from PDF using pdfjs-dist
    - Implement offset-based text location using offsetStart/offsetEnd
    - Create fallback text search using originalText field
    - Add page calculation logic for text positions
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 3.2 Build highlight rendering system
    - Create highlight overlay components with severity-based styling
    - Implement highlight positioning and bounding box calculation
    - Add highlight creation and removal functionality
    - Create scroll-to-highlight behavior
    - _Requirements: 2.1, 2.2, 5.2, 5.3_

- [x] 4. Integrate with existing issues system
  - [x] 4.1 Connect issue selection to PDF highlighting
    - Implement issue click handler that triggers PDF highlighting
    - Add selectedIssue prop handling in PdfViewer component
    - Create visual feedback for selected issues in the issues list
    - Handle issue selection state management
    - _Requirements: 2.1, 5.1, 5.4_

  - [x] 4.2 Add error handling and fallback behaviors
    - Implement error handling for PDF loading failures
    - Add fallback behavior when text cannot be located
    - Create user feedback messages for various error states
    - Add graceful degradation for unsupported PDF features
    - _Requirements: 1.3, 2.5_

- [x] 5. Add styling and visual enhancements
  - Create severity-based highlight colors (critical=red, high=orange, medium=yellow, low=green)
  - Add smooth scrolling animations for issue navigation
  - Implement loading states and progress indicators
  - Add hover effects and visual feedback for interactive elements
  - _Requirements: 1.4, 5.2_

- [ ] 6. Write comprehensive tests
  - [x] 6.1 Create unit tests for core functionality
    - Write tests for PdfViewer component props and state management
    - Test text location algorithms with various input scenarios
    - Create tests for highlight creation and positioning logic
    - Add tests for error handling and edge cases
    - _Requirements: All requirements_

  - [x] 6.2 Add integration tests
    - Test PDF loading with different document formats
    - Verify issue selection and highlighting integration
    - Test responsive layout behavior across screen sizes
    - Add performance tests for large documents
    - _Requirements: All requirements_