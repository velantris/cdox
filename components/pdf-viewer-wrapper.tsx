"use client"

import { Card, CardContent } from "@/components/ui/card"
import dynamic from 'next/dynamic'

// Add loading spinner styles
const loaderStyles = `
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
`

// Inject styles
if (typeof document !== 'undefined' && !document.querySelector('#pdf-loader-styles')) {
  const styleElement = document.createElement('style')
  styleElement.id = 'pdf-loader-styles'
  styleElement.textContent = loaderStyles
  document.head.appendChild(styleElement)
}

// Dynamically import the PDF viewer with no SSR
const PdfViewer = dynamic(() => import('./pdf-viewer'), {
  ssr: false,
  loading: () => (
    <Card className="w-full h-96 flex items-center justify-center">
      <CardContent className="text-center space-y-4">
        <div className="multi-ring-loader mx-auto" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Loading PDF Viewer</h3>
          <p className="text-sm text-gray-600 mt-1">Initializing PDF rendering engine...</p>
        </div>
      </CardContent>
    </Card>
  )
})

interface Issue {
  _id: string
  originalText: string
  offsetStart?: number
  offsetEnd?: number
  severity: string
  type: string
}

interface PdfViewerWrapperProps {
  documentUrl: string
  selectedIssue?: Issue | null
  onIssueHighlight?: (issue: Issue, success: boolean) => void
  className?: string
}

export function PdfViewerWrapper(props: PdfViewerWrapperProps) {
  return <PdfViewer {...props} />
}