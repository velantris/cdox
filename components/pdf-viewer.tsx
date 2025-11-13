"use client"

import { PdfHighlightOverlay, type Highlight } from "@/components/pdf-highlight-overlay"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  extractTextFromPdf,
  locateTextByOffset,
  searchTextInPdf,
  type PdfTextExtractor,
  type TextSearchResult
} from "@/lib/pdf-text-extraction"
import { cn } from "@/lib/utils"
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

// Dynamic imports for PDF.js (client-side only)
let Document: any = null
let Page: any = null
let pdfjs: any = null

// Initialize PDF.js on client side
const initializePdfJs = async () => {
  if (typeof window !== 'undefined' && !Document) {
    try {
      // Dynamic import to prevent SSR issues
      const reactPdf = await import('react-pdf')
      Document = reactPdf.Document
      Page = reactPdf.Page
      pdfjs = reactPdf.pdfjs

      // Always use CDN for PDF.js worker to avoid module resolution issues
      // This is more reliable than local .mjs files in Next.js
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

      console.log(`PDF.js initialized with worker version ${pdfjs.version}`)
    } catch (error) {
      console.error('Failed to load PDF.js:', error)
      throw new Error('PDF viewer failed to initialize')
    }
  }
}

// Add custom CSS for enhanced animations and visual effects
const pdfViewerStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }
  
  @keyframes progressPulse {
    0%, 100% {
      transform: scaleX(1);
      opacity: 1;
    }
    50% {
      transform: scaleX(1.05);
      opacity: 0.8;
    }
  }
  
  @keyframes loadingDots {
    0%, 20% {
      opacity: 0;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(0.8);
    }
  }
  
  @keyframes slideInFromTop {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes buttonHover {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1.02);
    }
  }
  
  @keyframes smoothScrollHighlight {
    0% {
      background-color: rgba(59, 130, 246, 0.1);
      transform: scale(1);
    }
    50% {
      background-color: rgba(59, 130, 246, 0.2);
      transform: scale(1.02);
    }
    100% {
      background-color: transparent;
      transform: scale(1);
    }
  }
  
  @keyframes breathe {
    0%, 100% {
      transform: scale(1);
      opacity: 0.7;
    }
    50% {
      transform: scale(1.1);
      opacity: 1;
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
    }
    50% {
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.6);
    }
  }
  
  @keyframes slideUpFade {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes loadingDotsWave {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-10px);
      opacity: 1;
    }
  }
  
  @keyframes progressShine {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .shimmer-effect {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    background-size: 200px 100%;
    animation: shimmer 2s infinite;
  }
  
  .progress-pulse {
    animation: progressPulse 2s ease-in-out infinite;
  }
  
  .loading-dots > div:nth-child(1) {
    animation: loadingDots 1.4s infinite ease-in-out both;
    animation-delay: -0.32s;
  }
  
  .loading-dots > div:nth-child(2) {
    animation: loadingDots 1.4s infinite ease-in-out both;
    animation-delay: -0.16s;
  }
  
  .loading-dots > div:nth-child(3) {
    animation: loadingDots 1.4s infinite ease-in-out both;
  }
  
  .fade-in-up {
    animation: fadeInUp 0.3s ease-out;
  }
  
  .slide-in-top {
    animation: slideInFromTop 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .button-hover-effect:hover {
    animation: buttonHover 0.3s ease-out;
  }
  
  .smooth-scroll-target {
    scroll-behavior: smooth;
    animation: smoothScrollHighlight 2s ease-out;
  }
  
  .breathe-animation {
    animation: breathe 3s ease-in-out infinite;
  }
  
  .float-animation {
    animation: float 3s ease-in-out infinite;
  }
  
  .glow-pulse-animation {
    animation: glow 2s ease-in-out infinite;
  }
  
  .slide-up-fade-animation {
    animation: slideUpFade 0.6s ease-out;
  }
  
  .loading-dots-wave > div:nth-child(1) {
    animation: loadingDotsWave 1.4s infinite ease-in-out;
    animation-delay: -0.32s;
  }
  
  .loading-dots-wave > div:nth-child(2) {
    animation: loadingDotsWave 1.4s infinite ease-in-out;
    animation-delay: -0.16s;
  }
  
  .loading-dots-wave > div:nth-child(3) {
    animation: loadingDotsWave 1.4s infinite ease-in-out;
  }
  
  .progress-enhanced {
    position: relative;
    overflow: hidden;
  }
  
  .progress-enhanced::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    animation: progressShine 2s infinite;
  }
  
  .progress-bar {
    position: relative;
    overflow: hidden;
  }
  
  .progress-bar::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
    animation: progressShine 1.5s infinite;
  }
  
  /* Enhanced loading spinner with multiple rings */
  .enhanced-spinner {
    position: relative;
  }
  
  .enhanced-spinner::after {
    content: '';
    position: absolute;
    inset: -4px;
    border: 2px solid transparent;
    border-top: 2px solid rgba(59, 130, 246, 0.3);
    border-radius: 50%;
    animation: spin 3s linear infinite reverse;
  }
  
  .enhanced-spinner::before {
    content: '';
    position: absolute;
    inset: -8px;
    border: 1px solid transparent;
    border-top: 1px solid rgba(59, 130, 246, 0.1);
    border-radius: 50%;
    animation: spin 4s linear infinite;
  }
  
  .multi-ring-loader {
    position: relative;
    width: 40px;
    height: 40px;
  }
  
  .multi-ring-loader::before,
  .multi-ring-loader::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    border: 2px solid transparent;
    animation: spin 1.5s linear infinite;
  }
  
  .multi-ring-loader::before {
    inset: 0;
    border-top-color: #3b82f6;
    animation-duration: 1.5s;
  }
  
  .multi-ring-loader::after {
    inset: 6px;
    border-top-color: #60a5fa;
    animation-duration: 2s;
    animation-direction: reverse;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .progress-ring {
    position: relative;
    width: 60px;
    height: 60px;
  }
  
  .progress-ring svg {
    transform: rotate(-90deg);
    width: 100%;
    height: 100%;
  }
  
  .progress-ring circle {
    fill: none;
    stroke-width: 4;
    stroke-linecap: round;
  }
  
  .progress-ring .background {
    stroke: rgba(59, 130, 246, 0.1);
  }
  
  .progress-ring .progress {
    stroke: #3b82f6;
    stroke-dasharray: 157; /* 2 * π * 25 */
    stroke-dashoffset: 157;
    transition: stroke-dashoffset 0.3s ease;
    animation: progressRingPulse 2s ease-in-out infinite;
  }
  
  @keyframes progressRingPulse {
    0%, 100% {
      stroke-width: 4;
      opacity: 1;
    }
    50% {
      stroke-width: 6;
      opacity: 0.8;
    }
  }
  
  /* Smooth transitions for all interactive elements */
  .interactive-element {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .interactive-element:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1);
  }
  
  .interactive-element:active {
    transform: translateY(-1px);
    transition-duration: 0.1s;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
  
  .btn-enhanced {
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.2);
  }
  
  .btn-enhanced::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    transition: left 0.5s;
  }
  
  .btn-enhanced:hover::before {
    left: 100%;
  }
  
  .btn-enhanced:hover {
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }
  
  .tooltip-enhanced {
    position: relative;
  }
  
  .tooltip-enhanced::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s, transform 0.3s;
    z-index: 1000;
    margin-bottom: 5px;
  }
  
  .tooltip-enhanced::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 1000;
  }
  
  .tooltip-enhanced:hover::after,
  .tooltip-enhanced:hover::before {
    opacity: 1;
    transform: translateX(-50%) translateY(-2px);
  }
`

// Inject styles into document head
if (typeof document !== 'undefined' && !document.querySelector('#pdf-viewer-styles')) {
  const styleElement = document.createElement('style')
  styleElement.id = 'pdf-viewer-styles'
  styleElement.textContent = pdfViewerStyles
  document.head.appendChild(styleElement)
}

// Check if PDF.js is initialized and worker is available
const checkPdfJsAvailability = () => {
  try {
    if (!pdfjs || !Document || !Page) {
      return false
    }
    // Try to access the worker source
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      console.warn('PDF.js worker source not configured')
      return false
    }
    return true
  } catch (error) {
    console.error('PDF.js availability check failed:', error)
    return false
  }
}

// TypeScript interfaces
interface Issue {
  _id: string
  originalText: string
  offsetStart?: number
  offsetEnd?: number
  severity: string
  type: string
}

interface PdfViewerProps {
  documentUrl: string
  selectedIssue?: Issue | null
  onIssueHighlight?: (issue: Issue, success: boolean) => void
  className?: string
}

interface PdfViewerState {
  numPages: number
  currentPage: number
  scale: number
  isLoading: boolean
  error: string | null
  textExtractor: PdfTextExtractor | null
  isExtractingText: boolean
  highlights: Highlight[]
  selectedHighlight: Highlight | null
}

// Error Boundary Component
function PdfErrorBoundary({ children, error, onRetry, documentUrl }: {
  children: React.ReactNode
  error: string | null
  onRetry: () => void
  documentUrl: string
}) {
  if (error) {
    // Determine error type and provide appropriate fallback
    const isNetworkError = error.includes('network') || error.includes('fetch') || error.includes('CORS')
    const isFormatError = error.includes('format') || error.includes('invalid') || error.includes('corrupted')
    const isPermissionError = error.includes('permission') || error.includes('access')

    let errorTitle = "Failed to load PDF"
    let errorDescription = error
    let showDownloadFallback = true

    if (isNetworkError) {
      errorTitle = "Network Error"
      errorDescription = "Unable to load PDF due to network issues. Please check your connection and try again."
    } else if (isFormatError) {
      errorTitle = "Invalid PDF Format"
      errorDescription = "The PDF file appears to be corrupted or in an unsupported format."
      showDownloadFallback = true
    } else if (isPermissionError) {
      errorTitle = "Access Denied"
      errorDescription = "You don&apos;t have permission to view this PDF file."
      showDownloadFallback = false
    }

    return (
      <Card className="w-full h-96 flex items-center justify-center slide-in-top">
        <CardContent className="text-center space-y-4 fade-in-up">
          <div className="relative">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
            <div className="absolute inset-0 w-12 h-12 mx-auto rounded-full border-2 border-red-200 animate-ping" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{errorTitle}</h3>
            <p className="text-sm text-gray-600 mt-1">{errorDescription}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={onRetry} variant="outline" className="interactive-element button-hover-effect btn-enhanced tooltip-enhanced" data-tooltip="Reload the PDF document">
              Try Again
            </Button>
            {showDownloadFallback && documentUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(documentUrl, '_blank')}
                className="interactive-element button-hover-effect btn-enhanced tooltip-enhanced"
                data-tooltip="Download PDF file to view offline"
              >
                Download PDF
              </Button>
            )}
          </div>
          {isNetworkError && (
            <div className="text-xs text-gray-500 mt-2">
              <p>Troubleshooting tips:</p>
              <ul className="list-disc list-inside text-left max-w-sm mx-auto">
                <li>Check your internet connection</li>
                <li>Disable ad blockers or VPN</li>
                <li>Try refreshing the page</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
  return <>{children}</>
}

// PDF Controls Component
function PdfControls({
  currentPage,
  numPages,
  scale,
  onPageChange,
  onScaleChange
}: {
  currentPage: number
  numPages: number
  scale: number
  onPageChange: (page: number) => void
  onScaleChange: (scale: number) => void
}) {
  const [pageInput, setPageInput] = useState(currentPage.toString())

  useEffect(() => {
    setPageInput(currentPage.toString())
  }, [currentPage])

  const handlePageInputChange = (value: string) => {
    setPageInput(value)
  }

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput, 10)
    if (page >= 1 && page <= numPages) {
      onPageChange(page)
    } else {
      setPageInput(currentPage.toString())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit()
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 bg-gray-50 border-b gap-3 sm:gap-0">
      {/* Page Navigation Controls */}
      <div className="flex items-center space-x-2 order-1 sm:order-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3 interactive-element button-hover-effect btn-enhanced tooltip-enhanced disabled:hover:scale-100 disabled:hover:shadow-none disabled:opacity-50"
          data-tooltip="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">Prev</span>
        </Button>

        <div className="flex items-center space-x-1 sm:space-x-2">
          <Input
            type="text"
            value={pageInput}
            onChange={(e) => handlePageInputChange(e.target.value)}
            onBlur={handlePageInputSubmit}
            onKeyDown={handleKeyDown}
            className="w-12 sm:w-16 text-center text-sm h-8 sm:h-9 interactive-element focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 tooltip-enhanced hover:bg-blue-50 hover:border-blue-300 focus:bg-white focus:shadow-lg"
            data-tooltip="Enter page number and press Enter"
            size={3}
          />
          <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
            of {numPages}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= numPages}
          className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3 interactive-element button-hover-effect btn-enhanced tooltip-enhanced disabled:hover:scale-100 disabled:hover:shadow-none disabled:opacity-50"
          data-tooltip="Next page"
        >
          <ChevronRight className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">Next</span>
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center space-x-2 order-2 sm:order-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onScaleChange(Math.max(0.5, scale - 0.1))}
          disabled={scale <= 0.5}
          className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3 interactive-element button-hover-effect btn-enhanced tooltip-enhanced disabled:hover:scale-100 disabled:hover:shadow-none disabled:opacity-50"
          data-tooltip="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">Out</span>
        </Button>

        <div className="relative">
          <span className="text-xs sm:text-sm text-gray-600 min-w-[45px] sm:min-w-[60px] text-center font-medium bg-gray-100 px-2 py-1 rounded-md border transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 cursor-default tooltip-enhanced" data-tooltip="Current zoom level">
            {Math.round(scale * 100)}%
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onScaleChange(Math.min(2.0, scale + 0.1))}
          disabled={scale >= 2.0}
          className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3 interactive-element button-hover-effect btn-enhanced tooltip-enhanced disabled:hover:scale-100 disabled:hover:shadow-none disabled:opacity-50"
          data-tooltip="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">In</span>
        </Button>
      </div>
    </div>
  )
}

// Client-side wrapper to prevent SSR issues
function PdfViewerClient({
  documentUrl,
  selectedIssue,
  onIssueHighlight,
  className
}: PdfViewerProps) {
  const [state, setState] = useState<PdfViewerState>({
    numPages: 0,
    currentPage: 1,
    scale: 1.0,
    isLoading: true,
    error: null,
    textExtractor: null,
    isExtractingText: false,
    highlights: [],
    selectedHighlight: null
  })
  const [pdfJsReady, setPdfJsReady] = useState(false)
  const [isClient, setIsClient] = useState(false)

  const pageRef = useRef<HTMLDivElement>(null)

  // Define all callbacks first to ensure consistent hook order
  const handleDocumentLoadSuccess = useCallback(async ({ numPages }: { numPages: number }) => {
    setState(prev => ({
      ...prev,
      numPages,
      isLoading: false,
      error: null,
      isExtractingText: true
    }))

    // Extract text content from the PDF with timeout
    try {
      // Set a timeout for text extraction (30 seconds)
      const extractionPromise = extractTextFromPdf(documentUrl)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Text extraction timed out after 30 seconds')), 30000)
      })

      const textExtractor = await Promise.race([extractionPromise, timeoutPromise])
      setState(prev => ({
        ...prev,
        textExtractor,
        isExtractingText: false
      }))
    } catch (error) {
      console.error('Error extracting text:', error)

      // Create a fallback text extractor that indicates text extraction failed
      const fallbackExtractor: PdfTextExtractor = {
        documentText: '',
        pageTexts: [],
        isReady: false,
        extractionError: error instanceof Error ? error.message : 'Text extraction failed'
      }

      setState(prev => ({
        ...prev,
        isExtractingText: false,
        textExtractor: fallbackExtractor
      }))
    }
  }, [documentUrl])

  const handleDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error)

    // Enhance error message based on error type
    let errorMessage = error.message || 'Failed to load PDF document'

    if (error.message.includes('worker')) {
      errorMessage = 'PDF worker failed to load. Please refresh the page and try again.'
    } else if (error.message.includes('password')) {
      errorMessage = 'This PDF is password protected and cannot be displayed.'
    } else if (error.message.includes('encrypted')) {
      errorMessage = 'This PDF is encrypted and cannot be displayed in the browser.'
    } else if (error.message.includes('cors') || error.message.includes('CORS')) {
      errorMessage = 'Cannot load PDF due to security restrictions. Try downloading the file instead.'
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = 'Network error while loading PDF. Please check your connection and try again.'
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      error: errorMessage
    }))
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }))
  }, [])

  const handleScaleChange = useCallback((scale: number) => {
    setState(prev => ({ ...prev, scale }))
  }, [])

  const handleRetry = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      textExtractor: null,
      isExtractingText: false,
      highlights: [],
      selectedHighlight: null
    }))
  }, [])

  // Create highlight from search result
  const createHighlight = useCallback((issue: Issue, searchResult: TextSearchResult): Highlight => {
    return {
      id: `highlight-${issue._id}`,
      issueId: issue._id,
      startOffset: searchResult.startOffset,
      endOffset: searchResult.endOffset,
      pageNumber: searchResult.pageNumber,
      severity: issue.severity as 'low' | 'medium' | 'high' | 'critical'
    }
  }, [])

  // Handle highlight click
  const handleHighlightClick = useCallback((highlight: Highlight) => {
    setState(prev => ({ ...prev, selectedHighlight: highlight }))
  }, [])

  // Enhanced scroll to highlight with smooth animations and visual feedback
  const scrollToHighlight = useCallback((highlight: Highlight) => {
    if (pageRef.current && highlight.boundingRect) {
      const container = pageRef.current.closest('.overflow-auto')
      if (container) {
        // Calculate optimal scroll position with padding for better visibility
        const containerHeight = container.clientHeight
        const targetY = highlight.boundingRect.y * state.scale - containerHeight / 3 // Position in upper third
        const scrollTop = Math.max(0, Math.min(targetY, container.scrollHeight - containerHeight))

        // Add smooth scroll class to container for enhanced behavior
        container.classList.add('smooth-scroll-target')

        // Pre-scroll visual feedback
        const highlightElement = document.querySelector(`[data-highlight-id="${highlight.id}"]`) as HTMLElement
        if (highlightElement) {
          // Add pulsing effect before scroll
          highlightElement.classList.add('highlight-pulse')

          // Create a temporary focus ring
          const focusRing = document.createElement('div')
          focusRing.style.cssText = `
                        position: absolute;
                        top: -4px;
                        left: -4px;
                        right: -4px;
                        bottom: -4px;
                        border: 3px solid rgba(59, 130, 246, 0.6);
                        border-radius: 8px;
                        pointer-events: none;
                        animation: pulseGlow 1s ease-out;
                        z-index: 30;
                    `
          highlightElement.appendChild(focusRing)

          // Remove focus ring after animation
          setTimeout(() => {
            if (focusRing.parentNode) {
              focusRing.parentNode.removeChild(focusRing)
            }
          }, 1000)
        }

        // Enhanced smooth scroll with custom easing
        const startTime = performance.now()
        const startScrollTop = container.scrollTop
        const distance = scrollTop - startScrollTop
        const duration = Math.min(1000, Math.max(300, Math.abs(distance) * 0.5)) // Dynamic duration

        const easeInOutCubic = (t: number) => {
          return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
        }

        const animateScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime
          const progress = Math.min(elapsed / duration, 1)
          const easedProgress = easeInOutCubic(progress)

          container.scrollTop = startScrollTop + distance * easedProgress

          if (progress < 1) {
            requestAnimationFrame(animateScroll)
          } else {
            // Scroll complete - add final visual feedback
            if (highlightElement) {
              // Remove pulse and add completion effect
              highlightElement.classList.remove('highlight-pulse')

              // Add a subtle bounce effect
              const element = highlightElement as HTMLElement
              element.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
              element.style.transform = 'scale(1.08)'

              setTimeout(() => {
                element.style.transform = 'scale(1)'
                setTimeout(() => {
                  element.style.transition = ''
                }, 400)
              }, 200)
            }

            // Remove smooth scroll class
            setTimeout(() => {
              container.classList.remove('smooth-scroll-target')
            }, 100)
          }
        }

        requestAnimationFrame(animateScroll)
      }
    }
  }, [state.scale])

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize PDF.js on mount
  useEffect(() => {
    if (!isClient) return

    const initPdf = async () => {
      try {
        await initializePdfJs()
        if (checkPdfJsAvailability()) {
          setPdfJsReady(true)
        } else {
          setState(prev => ({
            ...prev,
            error: 'PDF viewer is not properly configured. Please refresh the page and try again.',
            isLoading: false
          }))
        }
      } catch (error) {
        console.error('Failed to initialize PDF.js:', error)
        setState(prev => ({
          ...prev,
          error: 'Failed to load PDF viewer. Please refresh the page and try again.',
          isLoading: false
        }))
      }
    }

    initPdf()
  }, [isClient])

  // Handle issue selection and text location
  useEffect(() => {
    if (selectedIssue && state.textExtractor && onIssueHighlight) {
      // Check if text extraction failed
      if (state.textExtractor.extractionError) {
        console.warn('Text extraction failed, cannot locate issue:', state.textExtractor.extractionError)
        setState(prev => ({
          ...prev,
          highlights: [],
          selectedHighlight: null
        }))
        onIssueHighlight(selectedIssue, false)
        return
      }

      // Check if text extractor is ready
      if (!state.textExtractor.isReady) {
        console.warn('Text extractor not ready, cannot locate issue')
        setState(prev => ({
          ...prev,
          highlights: [],
          selectedHighlight: null
        }))
        onIssueHighlight(selectedIssue, false)
        return
      }

      let searchResult: TextSearchResult | null = null
      let searchMethod = 'none'

      // Try offset-based location first (primary method)
      if (selectedIssue.offsetStart !== undefined && selectedIssue.offsetEnd !== undefined) {
        try {
          searchResult = locateTextByOffset(
            state.textExtractor,
            selectedIssue.offsetStart,
            selectedIssue.offsetEnd
          )
          searchMethod = 'offset'
          console.log('Offset-based search result:', searchResult)
        } catch (error) {
          console.warn('Offset-based search failed:', error)
        }
      }

      // Fallback to text search if offset method failed
      if (!searchResult?.found && selectedIssue.originalText && selectedIssue.originalText.trim()) {
        try {
          searchResult = searchTextInPdf(state.textExtractor, selectedIssue.originalText)
          searchMethod = 'text'
          console.log('Text-based search result:', searchResult)
        } catch (error) {
          console.warn('Text-based search failed:', error)
        }
      }

      if (searchResult?.found) {
        // Create highlight for the found text
        const highlight = createHighlight(selectedIssue, searchResult)

        // Update highlights - remove previous highlights and add new one
        setState(prev => ({
          ...prev,
          highlights: [highlight],
          selectedHighlight: highlight,
          currentPage: searchResult.pageNumber
        }))

        // Scroll to highlight after a brief delay to ensure rendering
        setTimeout(() => scrollToHighlight(highlight), 200)

        onIssueHighlight(selectedIssue, true)
        console.log(`Successfully located issue using ${searchMethod} method`)
      } else {
        console.warn('Could not locate text for issue:', {
          issueId: selectedIssue._id,
          hasOffset: selectedIssue.offsetStart !== undefined,
          hasText: !!selectedIssue.originalText,
          textLength: selectedIssue.originalText?.length || 0,
          searchMethod
        })

        // Clear highlights if text not found
        setState(prev => ({
          ...prev,
          highlights: [],
          selectedHighlight: null
        }))
        onIssueHighlight(selectedIssue, false)
      }
    } else if (!selectedIssue) {
      // Clear highlights when no issue is selected
      setState(prev => ({
        ...prev,
        highlights: [],
        selectedHighlight: null
      }))
    }
  }, [selectedIssue, state.textExtractor, createHighlight, scrollToHighlight, onIssueHighlight])

  // Show loading state during SSR and initial client render
  if (!isClient || !pdfJsReady) {
    return (
      <Card className={cn("w-full h-96 flex items-center justify-center", className)}>
        <CardContent className="text-center space-y-4">
          <div className="multi-ring-loader mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Loading PDF Viewer</h3>
            <p className="text-sm text-gray-600 mt-1">Initializing PDF rendering engine...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-white border rounded-lg",
      "min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]",
      className
    )}>
      <PdfErrorBoundary error={state.error} onRetry={handleRetry} documentUrl={documentUrl}>
        {state.numPages > 0 && (
          <PdfControls
            currentPage={state.currentPage}
            numPages={state.numPages}
            scale={state.scale}
            onPageChange={handlePageChange}
            onScaleChange={handleScaleChange}
          />
        )}

        <div className="flex-1 overflow-auto bg-gray-100 smooth-scroll pdf-container">
          {(state.isLoading || state.isExtractingText || !pdfJsReady) && !state.error && (
            <div className="flex items-center justify-center h-full min-h-[300px] fade-in-up">
              <div className="text-center space-y-6 max-w-sm">
                {/* Enhanced loading spinner with multiple effects and progress ring */}
                <div className="relative enhanced-spinner glow-pulse-animation">
                  <div className="progress-ring mx-auto">
                    <svg>
                      <circle className="background" cx="30" cy="30" r="25" />
                      <circle
                        className="progress"
                        cx="30"
                        cy="30"
                        r="25"
                        style={{
                          strokeDashoffset: state.isLoading ? 94 : 16 // 60% and 90% of 157
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  </div>
                  <div className="absolute inset-0 w-16 h-16 mx-auto rounded-full border-2 border-blue-200 breathe-animation" />
                  <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full border border-blue-100 animate-ping" />
                </div>

                {/* Enhanced progress indicator */}
                <div className="space-y-6 slide-in-top">
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-gray-800 float-animation">
                      {state.isLoading ? '📄 Loading PDF Document' : '🔍 Preparing Highlights'}
                    </h3>
                    <p className="text-sm text-gray-600 max-w-xs mx-auto">
                      {state.isLoading
                        ? 'Fetching and rendering your document...'
                        : 'Extracting text for precise issue highlighting...'}
                    </p>
                  </div>

                  {/* Multi-stage animated progress bar with enhanced styling */}
                  <div className="w-full max-w-md mx-auto">
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner progress-enhanced relative">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full progress-pulse progress-bar relative overflow-hidden"
                        style={{
                          width: state.isLoading ? '60%' : '90%',
                          transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 shimmer-effect" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>{state.isLoading ? 'Loading...' : 'Processing...'}</span>
                      <span>{state.isLoading ? '60%' : '90%'}</span>
                    </div>
                  </div>

                  {/* Enhanced status message with animated dots */}
                  <div className="flex items-center justify-center space-x-3">
                    <div className="loading-dots-wave flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium animate-pulse">
                      {state.isLoading
                        ? 'Rendering document pages and preparing viewer...'
                        : 'Extracting text content for intelligent highlighting...'
                      }
                    </p>
                  </div>

                  {/* Additional loading tips with enhanced styling */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 slide-up-fade-animation shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <span className="text-white text-sm">💡</span>
                      </div>
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-2">Pro Tip:</p>
                        <p className="leading-relaxed">
                          Once loaded, click on any issue in the list to automatically scroll to and highlight it in the PDF.
                          Use the zoom controls to get a better view of highlighted text.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced loading dots animation */}
                  {state.isExtractingText && (
                    <div className="flex items-center justify-center space-x-3 text-xs text-blue-600 bg-blue-50 rounded-lg p-3">
                      <div className="loading-dots flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      </div>
                      <span className="font-medium">Processing large document - this may take a moment</span>
                    </div>
                  )}

                  {/* Progress percentage display */}
                  <div className="text-xs text-gray-500 font-mono">
                    {state.isLoading ? '60%' : '90%'} Complete
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show warning if text extraction failed */}
          {state.textExtractor?.extractionError && !state.isLoading && !state.isExtractingText && pdfJsReady && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-4 m-4 shadow-sm slide-in-top">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-yellow-600 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-800 flex items-center">
                    ⚠️ Text Extraction Failed
                  </h4>
                  <p className="text-sm text-yellow-700 mt-2 leading-relaxed">
                    Issue highlighting is not available for this PDF. You can still view the document normally, but clicking on issues won&apos;t highlight text.
                  </p>
                  <details className="mt-2">
                    <summary className="text-xs text-yellow-600 cursor-pointer hover:text-yellow-800 transition-colors">
                      Show technical details
                    </summary>
                    <p className="text-xs text-yellow-600 mt-1 font-mono bg-yellow-100 p-2 rounded border">
                      {state.textExtractor.extractionError}
                    </p>
                  </details>
                </div>
              </div>
            </div>
          )}

          {pdfJsReady && Document && Page ? (
            <Document
              file={documentUrl}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={handleDocumentLoadError}
              loading={null}
              error={null}
              className="flex justify-center p-2 sm:p-4"
            >
              <div ref={pageRef} className="relative">
                <Page
                  pageNumber={state.currentPage}
                  scale={state.scale}
                  loading={
                    <div className="flex items-center justify-center h-full min-h-[300px]">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-red-500 space-y-2">
                      <AlertCircle className="w-8 h-8" />
                      <div className="text-center">
                        <p className="font-medium">Failed to load page {state.currentPage}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Try navigating to a different page or refreshing the document
                        </p>
                      </div>
                    </div>
                  }
                  className="shadow-lg max-w-full"
                  width={undefined}
                  height={undefined}
                />

                {/* Highlight overlay */}
                <PdfHighlightOverlay
                  highlights={state.highlights}
                  pageNumber={state.currentPage}
                  scale={state.scale}
                  pageRef={pageRef}
                  onHighlightClick={handleHighlightClick}
                />
              </div>
            </Document>
          ) : (
            !state.error && (
              <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                  <p className="text-sm text-gray-600">Initializing PDF viewer...</p>
                </div>
              </div>
            )
          )}
        </div>
      </PdfErrorBoundary>
    </div>
  )
}
// Export the client-side PDF viewer
export default PdfViewerClient
export { PdfViewerClient as PdfViewer }
