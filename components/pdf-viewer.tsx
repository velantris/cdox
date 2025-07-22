"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Dynamically import PDF components to avoid SSR issues
const PdfDocument = dynamic(() => import("react-pdf").then(mod => ({ default: mod.Document })), { ssr: false })
const Page = dynamic(() => import("react-pdf").then(mod => ({ default: mod.Page })), { ssr: false })

interface PdfViewerProps {
    documentUrl: string
    selectedIssue: any
    onIssueSelect: (issue: any) => void
    issues: any[]
}

export function PdfViewer({ documentUrl, selectedIssue, onIssueSelect, issues }: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number>(0)
    const [pdfDocProxy, setPdfDocProxy] = useState<any | null>(null)
    const [isClient, setIsClient] = useState(false)
    const viewerContainerRef = useRef<HTMLDivElement>(null)
    const pageRefsRef = useRef<Record<number, HTMLDivElement>>({})

    // Page offset mapping for character-based scrolling
    const pageCharRangesRef = useRef<{
        pageNumber: number;
        startOffset: number;
        endOffset: number;
        textContent: string;
    }[]>([])

    // Initialize PDF.js
    useEffect(() => {
        setIsClient(true)
        const initPdfjs = async () => {
            const pdfjs = await import("react-pdf").then(mod => mod.pdfjs)
            pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
        }
        initPdfjs()
    }, [])

    // Build page offset map when PDF loads
    useEffect(() => {
        if (!pdfDocProxy) return

        const buildPageOffsetMap = async () => {
            const ranges: typeof pageCharRangesRef.current = []
            let cumulative = 0

            for (let i = 1; i <= pdfDocProxy.numPages; i++) {
                try {
                    const page = await pdfDocProxy.getPage(i)
                    const content = await page.getTextContent()
                    const textItems = content.items as any[]
                    const pageText = textItems.map(it => it.str).join(" ")

                    const startOffset = cumulative
                    cumulative += pageText.length
                    const endOffset = cumulative

                    ranges.push({
                        pageNumber: i,
                        startOffset,
                        endOffset,
                        textContent: pageText
                    })
                } catch (err) {
                    console.error("Failed building page offset map:", err)
                }
            }

            pageCharRangesRef.current = ranges
            console.log("Built page offset map:", ranges.length, "pages")
        }

        buildPageOffsetMap()
    }, [pdfDocProxy])

    // Handle scrolling to selected issue
    useEffect(() => {
        if (!selectedIssue || !pageCharRangesRef.current.length || !viewerContainerRef.current) return

        const scrollToIssue = async () => {
            let targetPage = 1

            // Try offset-based lookup first
            if (typeof selectedIssue.offsetStart === "number") {
                const range = pageCharRangesRef.current.find(
                    r => selectedIssue.offsetStart >= r.startOffset && selectedIssue.offsetStart < r.endOffset
                )
                if (range) {
                    targetPage = range.pageNumber
                    console.log("Found page via offset:", targetPage)
                }
            }

            // Fallback to text search
            if (targetPage === 1 && selectedIssue.originalText) {
                const searchText = selectedIssue.originalText.slice(0, 100).toLowerCase()
                const foundRange = pageCharRangesRef.current.find(r =>
                    r.textContent.toLowerCase().includes(searchText)
                )
                if (foundRange) {
                    targetPage = foundRange.pageNumber
                    console.log("Found page via text search:", targetPage)
                }
            }

            // Scroll to the page
            const pageElement = pageRefsRef.current[targetPage]
            const container = viewerContainerRef.current

            if (pageElement && container) {
                const containerRect = container.getBoundingClientRect()
                const pageRect = pageElement.getBoundingClientRect()
                const scrollTop = container.scrollTop + pageRect.top - containerRect.top - 20

                container.scrollTo({
                    top: Math.max(0, scrollTop),
                    behavior: "smooth"
                })

                console.log("Scrolled to page:", targetPage)
            }
        }

        // Add a small delay to ensure DOM is ready
        const timeoutId = setTimeout(scrollToIssue, 200)
        return () => clearTimeout(timeoutId)
    }, [selectedIssue])

    // Text highlighting component
    const TextHighlight = ({ pageNumber, searchText }: { pageNumber: number; searchText: string }) => {
        const [highlights, setHighlights] = useState<any[]>([])

            useEffect(() => {
      if (!pdfDocProxy || !searchText) {
        setHighlights([])
        return
      }

            const findHighlights = async () => {
                try {
                    const page = await pdfDocProxy.getPage(pageNumber)
                    const content = await page.getTextContent()
                    const viewport = page.getViewport({ scale: 1 })
                    const textItems = content.items as any[]

                    // Simple text matching - normalize and find positions
                    const normalizeText = (text: string) =>
                        text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()

                    const normalizedSearch = normalizeText(searchText.slice(0, 50))
                    const positions: any[] = []

                    // Build continuous text and track positions
                    let fullText = ''
                    const itemMap: { char: number; item: any }[] = []

                    textItems.forEach(item => {
                        const itemText = item.str
                        for (let i = 0; i < itemText.length; i++) {
                            itemMap.push({ char: fullText.length + i, item })
                        }
                        fullText += itemText + ' '
                    })

                    const normalizedFull = normalizeText(fullText)
                    const searchIndex = normalizedFull.indexOf(normalizedSearch)

                    if (searchIndex !== -1) {
                        // Find items that correspond to the match
                        const matchStart = searchIndex
                        const matchEnd = searchIndex + normalizedSearch.length

                        const matchedItems = new Set()
                        for (let i = matchStart; i < Math.min(matchEnd, itemMap.length); i++) {
                            if (itemMap[i]) {
                                matchedItems.add(itemMap[i].item)
                            }
                        }

                        // Create highlight rectangles
                        Array.from(matchedItems).forEach((item: any, index) => {
                            positions.push({
                                id: `highlight-${pageNumber}-${index}`,
                                left: (item.transform[4] / viewport.width) * 100,
                                top: ((viewport.height - item.transform[5] - item.height) / viewport.height) * 100,
                                width: (item.width / viewport.width) * 100,
                                height: (item.height / viewport.height) * 100,
                            })
                        })
                    }

                    setHighlights(positions)
                    console.log("Created highlights:", positions.length)
                } catch (error) {
                    console.error('Error finding highlights:', error)
                    setHighlights([])
                }
            }

            findHighlights()
        }, [pageNumber, searchText, pdfDocProxy])

        return (
            <>
                {highlights.map((highlight) => (
                    <div
                        key={highlight.id}
                        className="absolute bg-yellow-400 opacity-60 pointer-events-none rounded-sm animate-pulse"
                        style={{
                            left: `${highlight.left}%`,
                            top: `${highlight.top}%`,
                            width: `${highlight.width}%`,
                            height: `${highlight.height}%`,
                            boxShadow: '0 0 0 2px #fbbf24',
                        }}
                    />
                ))}
            </>
        )
    }

    if (!isClient) {
        return (
            <div className="flex items-center justify-center h-96 border rounded">
                <div className="text-gray-500">Loading PDF viewer...</div>
            </div>
        )
    }

    return (
        <div
            ref={viewerContainerRef}
            className="overflow-auto max-h-[calc(100vh-250px)] border rounded bg-gray-50"
        >
            <PdfDocument
                file={documentUrl}
                onLoadSuccess={(pdf) => {
                    setNumPages(pdf.numPages)
                    setPdfDocProxy(pdf)
                    console.log("PDF loaded with", pdf.numPages, "pages")
                }}
                onLoadError={(error) => {
                    console.error("PDF load error:", error)
                }}
            >
                {Array.from({ length: numPages }, (_, i) => {
                    const pageNum = i + 1
                    return (
                        <div
                            key={`page_${pageNum}`}
                            ref={(el) => {
                                if (el) pageRefsRef.current[pageNum] = el
                            }}
                            className="mb-4 flex justify-center relative bg-white shadow-sm"
                        >
                            <div className="relative">
                                <Page pageNumber={pageNum} width={600} />
                                {selectedIssue && (
                                    <div className="absolute inset-0">
                                        <TextHighlight
                                            pageNumber={pageNum}
                                            searchText={selectedIssue.originalText}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </PdfDocument>
        </div>
    )
} 