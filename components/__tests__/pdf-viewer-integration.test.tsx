import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { PdfViewerWrapper as PdfViewer } from '../pdf-viewer-wrapper'

// Mock PDF.js with more realistic behavior
vi.mock('react-pdf', () => {
    let mockNumPages = 5
    let mockLoadError: Error | null = null
    let mockLoadDelay = 100

    const mockDocument = {
        numPages: mockNumPages,
        getPage: vi.fn().mockImplementation((pageNum: number) =>
            Promise.resolve({
                getTextContent: vi.fn().mockResolvedValue({
                    items: [
                        { str: `This is page ${pageNum} content`, hasEOL: false },
                        { str: ' with some additional text', hasEOL: true },
                        { str: ` and more content on page ${pageNum}`, hasEOL: false }
                    ]
                })
            })
        )
    }

    return {
        Document: vi.fn(({ onLoadSuccess, onLoadError, children }) => {
            setTimeout(() => {
                if (mockLoadError) {
                    onLoadError?.(mockLoadError)
                } else {
                    onLoadSuccess?.(mockDocument)
                }
            }, mockLoadDelay)
            return <div data-testid="pdf-document">{children}</div>
        }),
        Page: vi.fn(({ pageNumber, scale, onRenderSuccess, onRenderError }) => {
            setTimeout(() => {
                if (pageNumber > mockNumPages) {
                    onRenderError?.(new Error('Page not found'))
                } else {
                    onRenderSuccess?.()
                }
            }, 50)
            return (
                <div
                    data-testid={`pdf-page-${pageNumber}`}
                    data-page-number={pageNumber}
                    data-scale={scale}
                    style={{
                        width: `${400 * scale}px`,
                        height: `${600 * scale}px`,
                        transform: `scale(${scale})`
                    }}
                >
                    <div className="react-pdf__Page__textContent">
                        <span>This is page {pageNumber} content with some additional text and more content on page {pageNumber}</span>
                    </div>
                </div>
            )
        }),
        pdfjs: {
            GlobalWorkerOptions: {
                workerSrc: '/pdf.worker.min.mjs'
            }
        },
        // Test utilities
        __setMockNumPages: (pages: number) => { mockNumPages = pages },
        __setMockLoadError: (error: Error | null) => { mockLoadError = error },
        __setMockLoadDelay: (delay: number) => { mockLoadDelay = delay }
    }
})

// Mock PDF text extraction with realistic behavior
vi.mock('@/lib/pdf-text-extraction', () => {
    let mockExtractorReady = true
    let mockExtractionDelay = 200
    let mockExtractionError: string | null = null

    const createMockExtractor = (numPages: number) => ({
        documentText: Array.from({ length: numPages }, (_, i) =>
            `This is page ${i + 1} content with some additional text and more content on page ${i + 1}`
        ).join('\n'),
        pageTexts: Array.from({ length: numPages }, (_, i) => ({
            pageNumber: i + 1,
            text: `This is page ${i + 1} content with some additional text and more content on page ${i + 1}`,
            textItems: [],
            startOffset: i * 100,
            endOffset: (i + 1) * 100 - 1
        })),
        isReady: mockExtractorReady,
        extractionError: mockExtractionError
    })

    return {
        extractTextFromPdf: vi.fn().mockImplementation((url: string) =>
            new Promise((resolve) => {
                setTimeout(() => {
                    resolve(createMockExtractor(5))
                }, mockExtractionDelay)
            })
        ),
        locateTextByOffset: vi.fn().mockImplementation((extractor, startOffset, endOffset) => {
            if (!extractor.isReady) {
                return { found: false, pageNumber: 1, startOffset: 0, endOffset: 0 }
            }

            const pageIndex = Math.floor(startOffset / 100)
            const pageNumber = Math.max(1, Math.min(pageIndex + 1, extractor.pageTexts.length))

            return {
                found: true,
                pageNumber,
                startOffset: startOffset % 100,
                endOffset: endOffset % 100
            }
        }),
        searchTextInPdf: vi.fn().mockImplementation((extractor, searchText) => {
            if (!extractor.isReady || !searchText.trim()) {
                return { found: false, pageNumber: 1, startOffset: 0, endOffset: 0 }
            }

            const normalizedSearch = searchText.toLowerCase()

            for (const page of extractor.pageTexts) {
                const normalizedPageText = page.text.toLowerCase()
                const index = normalizedPageText.indexOf(normalizedSearch)

                if (index !== -1) {
                    return {
                        found: true,
                        pageNumber: page.pageNumber,
                        startOffset: index,
                        endOffset: index + searchText.length
                    }
                }
            }

            return { found: false, pageNumber: 1, startOffset: 0, endOffset: 0 }
        }),
        // Test utilities
        __setMockExtractorReady: (ready: boolean) => { mockExtractorReady = ready },
        __setMockExtractionDelay: (delay: number) => { mockExtractionDelay = delay },
        __setMockExtractionError: (error: string | null) => { mockExtractionError = error }
    }
})

// Mock highlight overlay
vi.mock('../pdf-highlight-overlay', () => ({
    PdfHighlightOverlay: vi.fn(({ highlights, pageNumber, onHighlightClick }) => (
        <div data-testid="pdf-highlight-overlay" data-page={pageNumber}>
            {highlights.map((highlight: any) => (
                <div
                    key={highlight.id}
                    data-testid={`highlight-${highlight.id}`}
                    onClick={() => onHighlightClick?.(highlight)}
                    style={{
                        position: 'absolute',
                        left: highlight.boundingRect?.x || 0,
                        top: highlight.boundingRect?.y || 0,
                        width: highlight.boundingRect?.width || 100,
                        height: highlight.boundingRect?.height || 20,
                        backgroundColor: highlight.severity === 'critical' ? 'red' :
                            highlight.severity === 'high' ? 'orange' :
                                highlight.severity === 'medium' ? 'yellow' : 'green'
                    }}
                >
                    {highlight.severity} issue
                </div>
            ))}
        </div>
    ))
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
    Button: vi.fn(({ children, onClick, disabled, ...props }) => (
        <button onClick={onClick} disabled={disabled} {...props}>
            {children}
        </button>
    ))
}))

vi.mock('@/components/ui/card', () => ({
    Card: vi.fn(({ children, className }) => (
        <div className={className} data-testid="error-card">{children}</div>
    )),
    CardContent: vi.fn(({ children }) => <div>{children}</div>)
}))

vi.mock('@/components/ui/input', () => ({
    Input: vi.fn((props) => <input {...props} />)
}))

const createMockIssue = (id: string, severity: string, offsetStart?: number, offsetEnd?: number, originalText?: string) => ({
    _id: id,
    originalText: originalText || `Sample text for ${id}`,
    offsetStart,
    offsetEnd,
    severity,
    type: 'grammar'
})

describe('PDF Viewer Integration Tests', () => {
    const defaultProps = {
        documentUrl: 'https://example.com/test.pdf',
        selectedIssue: null,
        onIssueHighlight: vi.fn(),
        className: 'test-class'
    }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.clearAllTimers()
    })

    afterEach(() => {
        vi.clearAllTimers()
    })

    describe('PDF Loading with Different Document Formats', () => {
        it('should handle successful PDF loading', async () => {
            render(<PdfViewer {...defaultProps} />)

            expect(screen.getByTestId('pdf-document')).toBeInTheDocument()

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            }, { timeout: 2000 })
        })

        it('should handle large PDF documents', async () => {
            const { __setMockNumPages } = await import('react-pdf')
            __setMockNumPages(100)

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('of 100')).toBeInTheDocument()
            }, { timeout: 2000 })
        })

        it('should handle single page PDF', async () => {
            const { __setMockNumPages } = await import('react-pdf')
            __setMockNumPages(1)

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('of 1')).toBeInTheDocument()
                expect(screen.getByText('Next')).toBeDisabled()
            }, { timeout: 2000 })
        })

        it('should handle network errors during PDF loading', async () => {
            const { __setMockLoadError } = await import('react-pdf')
            __setMockLoadError(new Error('Network error: Failed to fetch PDF'))

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Network Error')).toBeInTheDocument()
                expect(screen.getByText(/network issues/)).toBeInTheDocument()
            }, { timeout: 2000 })
        })

        it('should handle corrupted PDF files', async () => {
            const { __setMockLoadError } = await import('react-pdf')
            __setMockLoadError(new Error('Invalid PDF format: corrupted file'))

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Invalid PDF Format')).toBeInTheDocument()
                expect(screen.getByText(/corrupted or in an unsupported format/)).toBeInTheDocument()
            }, { timeout: 2000 })
        })

        it('should handle permission errors', async () => {
            const { __setMockLoadError } = await import('react-pdf')
            __setMockLoadError(new Error('Access denied: permission required'))

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Access Denied')).toBeInTheDocument()
                expect(screen.getByText(/don't have permission/)).toBeInTheDocument()
            }, { timeout: 2000 })
        })

        it('should show download fallback for supported errors', async () => {
            const { __setMockLoadError } = await import('react-pdf')
            __setMockLoadError(new Error('Network error'))

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Download PDF')).toBeInTheDocument()
            }, { timeout: 2000 })
        })

        it('should handle slow loading PDFs with timeout', async () => {
            const { __setMockLoadDelay } = await import('react-pdf')
            __setMockLoadDelay(5000) // 5 second delay

            render(<PdfViewer {...defaultProps} />)

            // Should show loading state
            expect(screen.getByTestId('pdf-document')).toBeInTheDocument()

            // Should eventually load (we'll wait a reasonable time)
            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            }, { timeout: 6000 })
        })
    })

    describe('Issue Selection and Highlighting Integration', () => {
        it('should integrate issue selection with PDF highlighting end-to-end', async () => {
            const onIssueHighlight = vi.fn()
            const issue = createMockIssue('issue-1', 'critical', 10, 25, 'page 1 content')

            const { rerender } = render(
                <PdfViewer {...defaultProps} onIssueHighlight={onIssueHighlight} />
            )

            // Wait for PDF to load
            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            // Select an issue
            rerender(
                <PdfViewer
                    {...defaultProps}
                    selectedIssue={issue}
                    onIssueHighlight={onIssueHighlight}
                />
            )

            // Should highlight the issue and call callback
            await waitFor(() => {
                expect(onIssueHighlight).toHaveBeenCalledWith(issue, true)
                expect(screen.getByTestId('highlight-highlight-issue-1')).toBeInTheDocument()
            })
        })

        it('should handle multiple issue selections', async () => {
            const onIssueHighlight = vi.fn()
            const issue1 = createMockIssue('issue-1', 'critical', 10, 25)
            const issue2 = createMockIssue('issue-2', 'high', 150, 175) // Page 2

            const { rerender } = render(
                <PdfViewer {...defaultProps} onIssueHighlight={onIssueHighlight} />
            )

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            // Select first issue
            rerender(
                <PdfViewer
                    {...defaultProps}
                    selectedIssue={issue1}
                    onIssueHighlight={onIssueHighlight}
                />
            )

            await waitFor(() => {
                expect(onIssueHighlight).toHaveBeenCalledWith(issue1, true)
                expect(screen.getByDisplayValue('1')).toBeInTheDocument() // Should be on page 1
            })

            // Select second issue
            rerender(
                <PdfViewer
                    {...defaultProps}
                    selectedIssue={issue2}
                    onIssueHighlight={onIssueHighlight}
                />
            )

            await waitFor(() => {
                expect(onIssueHighlight).toHaveBeenCalledWith(issue2, true)
                expect(screen.getByDisplayValue('2')).toBeInTheDocument() // Should navigate to page 2
            })
        })

        it('should handle issue selection with text search fallback', async () => {
            const onIssueHighlight = vi.fn()
            const issue = createMockIssue('issue-1', 'medium', undefined, undefined, 'additional text')

            const { rerender } = render(
                <PdfViewer {...defaultProps} onIssueHighlight={onIssueHighlight} />
            )

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            rerender(
                <PdfViewer
                    {...defaultProps}
                    selectedIssue={issue}
                    onIssueHighlight={onIssueHighlight}
                />
            )

            await waitFor(() => {
                expect(onIssueHighlight).toHaveBeenCalledWith(issue, true)
            })
        })

        it('should handle issue selection when text cannot be found', async () => {
            const onIssueHighlight = vi.fn()
            const issue = createMockIssue('issue-1', 'low', undefined, undefined, 'non-existent text')

            const { rerender } = render(
                <PdfViewer {...defaultProps} onIssueHighlight={onIssueHighlight} />
            )

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            rerender(
                <PdfViewer
                    {...defaultProps}
                    selectedIssue={issue}
                    onIssueHighlight={onIssueHighlight}
                />
            )

            await waitFor(() => {
                expect(onIssueHighlight).toHaveBeenCalledWith(issue, false)
            })
        })

        it('should clear highlights when issue is deselected', async () => {
            const onIssueHighlight = vi.fn()
            const issue = createMockIssue('issue-1', 'critical', 10, 25)

            const { rerender } = render(
                <PdfViewer
                    {...defaultProps}
                    selectedIssue={issue}
                    onIssueHighlight={onIssueHighlight}
                />
            )

            await waitFor(() => {
                expect(screen.getByTestId('highlight-highlight-issue-1')).toBeInTheDocument()
            })

            // Deselect issue
            rerender(
                <PdfViewer
                    {...defaultProps}
                    selectedIssue={null}
                    onIssueHighlight={onIssueHighlight}
                />
            )

            await waitFor(() => {
                expect(screen.queryByTestId('highlight-highlight-issue-1')).not.toBeInTheDocument()
            })
        })

        it('should handle text extraction failures gracefully', async () => {
            const { __setMockExtractorReady } = await import('@/lib/pdf-text-extraction')
            __setMockExtractorReady(false)

            const onIssueHighlight = vi.fn()
            const issue = createMockIssue('issue-1', 'critical', 10, 25)

            const { rerender } = render(
                <PdfViewer {...defaultProps} onIssueHighlight={onIssueHighlight} />
            )

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            rerender(
                <PdfViewer
                    {...defaultProps}
                    selectedIssue={issue}
                    onIssueHighlight={onIssueHighlight}
                />
            )

            await waitFor(() => {
                expect(onIssueHighlight).toHaveBeenCalledWith(issue, false)
            })
        })
    })

    describe('Responsive Layout Behavior', () => {
        const mockMatchMedia = (matches: boolean) => {
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: vi.fn().mockImplementation(query => ({
                    matches,
                    media: query,
                    onchange: null,
                    addListener: vi.fn(),
                    removeListener: vi.fn(),
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    dispatchEvent: vi.fn(),
                })),
            })
        }

        it('should adapt to mobile screen sizes', async () => {
            mockMatchMedia(true) // Mobile

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            // Check that controls are responsive
            const prevButton = screen.getByText('Prev')
            const nextButton = screen.getByText('Next')

            expect(prevButton).toBeInTheDocument()
            expect(nextButton).toBeInTheDocument()
        })

        it('should adapt to tablet screen sizes', async () => {
            mockMatchMedia(false) // Desktop/tablet

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            // Should show full controls
            expect(screen.getByText('Prev')).toBeInTheDocument()
            expect(screen.getByText('Next')).toBeInTheDocument()
            expect(screen.getByText('In')).toBeInTheDocument()
            expect(screen.getByText('Out')).toBeInTheDocument()
        })

        it('should handle window resize events', async () => {
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            // Simulate window resize
            act(() => {
                window.dispatchEvent(new Event('resize'))
            })

            // Component should still be functional
            expect(screen.getByText('of 5')).toBeInTheDocument()
        })

        it('should maintain functionality across different viewport sizes', async () => {
            const user = userEvent.setup()

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            // Test navigation works regardless of screen size
            const nextButton = screen.getByText('Next')
            await user.click(nextButton)

            await waitFor(() => {
                expect(screen.getByDisplayValue('2')).toBeInTheDocument()
            })
        })
    })

    describe('Performance Tests for Large Documents', () => {
        it('should handle large PDFs without performance degradation', async () => {
            const { __setMockNumPages } = await import('react-pdf')
            __setMockNumPages(500) // Large document

            const startTime = performance.now()

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('of 500')).toBeInTheDocument()
            }, { timeout: 5000 })

            const loadTime = performance.now() - startTime
            expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds
        })

        it('should handle rapid page navigation efficiently', async () => {
            const user = userEvent.setup()

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            const startTime = performance.now()

            // Rapidly navigate through pages
            const nextButton = screen.getByText('Next')
            for (let i = 0; i < 4; i++) {
                await user.click(nextButton)
                await waitFor(() => {
                    expect(screen.getByDisplayValue((i + 2).toString())).toBeInTheDocument()
                })
            }

            const navigationTime = performance.now() - startTime
            expect(navigationTime).toBeLessThan(2000) // Should complete within 2 seconds
        })

        it('should handle multiple zoom operations efficiently', async () => {
            const user = userEvent.setup()

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('100%')).toBeInTheDocument()
            })

            const startTime = performance.now()

            // Perform multiple zoom operations
            const zoomInButton = screen.getByText('In')
            const zoomOutButton = screen.getByText('Out')

            for (let i = 0; i < 5; i++) {
                await user.click(zoomInButton)
                await user.click(zoomOutButton)
            }

            const zoomTime = performance.now() - startTime
            expect(zoomTime).toBeLessThan(1000) // Should complete within 1 second
        })

        it('should handle text extraction for large documents', async () => {
            const { __setMockExtractionDelay } = await import('@/lib/pdf-text-extraction')
            __setMockExtractionDelay(1000) // Simulate slower extraction

            const { __setMockNumPages } = await import('react-pdf')
            __setMockNumPages(100)

            const startTime = performance.now()

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('of 100')).toBeInTheDocument()
            }, { timeout: 3000 })

            const totalTime = performance.now() - startTime
            expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds
        })

        it('should handle memory efficiently with large documents', async () => {
            const { __setMockNumPages } = await import('react-pdf')
            __setMockNumPages(1000)

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('of 1000')).toBeInTheDocument()
            }, { timeout: 5000 })

            // Test that component doesn't crash with large documents
            expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
        })
    })

    describe('Error Recovery and Retry Mechanisms', () => {
        it('should allow retry after PDF loading failure', async () => {
            const { __setMockLoadError } = await import('react-pdf')
            __setMockLoadError(new Error('Network error'))

            const user = userEvent.setup()

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Try Again')).toBeInTheDocument()
            })

            // Clear error and retry
            __setMockLoadError(null)
            const retryButton = screen.getByText('Try Again')
            await user.click(retryButton)

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            }, { timeout: 2000 })
        })

        it('should handle intermittent network issues', async () => {
            const { __setMockLoadError, __setMockLoadDelay } = await import('react-pdf')

            // First attempt fails
            __setMockLoadError(new Error('Network timeout'))
            __setMockLoadDelay(100)

            const user = userEvent.setup()

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Try Again')).toBeInTheDocument()
            })

            // Second attempt succeeds
            __setMockLoadError(null)
            const retryButton = screen.getByText('Try Again')
            await user.click(retryButton)

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            }, { timeout: 2000 })
        })

        it('should handle text extraction errors with graceful degradation', async () => {
            const { __setMockExtractionError } = await import('@/lib/pdf-text-extraction')
            __setMockExtractionError('Text extraction failed')

            const onIssueHighlight = vi.fn()
            const issue = createMockIssue('issue-1', 'critical', 10, 25)

            const { rerender } = render(
                <PdfViewer {...defaultProps} onIssueHighlight={onIssueHighlight} />
            )

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            // Try to highlight issue - should fail gracefully
            rerender(
                <PdfViewer
                    {...defaultProps}
                    selectedIssue={issue}
                    onIssueHighlight={onIssueHighlight}
                />
            )

            await waitFor(() => {
                expect(onIssueHighlight).toHaveBeenCalledWith(issue, false)
            })

            // PDF viewer should still be functional
            expect(screen.getByText('of 5')).toBeInTheDocument()
        })
    })

    describe('Complex User Workflows', () => {
        it('should handle complete document review workflow', async () => {
            const user = userEvent.setup()
            const onIssueHighlight = vi.fn()

            const issues = [
                createMockIssue('issue-1', 'critical', 10, 25, 'page 1 content'),
                createMockIssue('issue-2', 'high', 150, 175, 'page 2 content'),
                createMockIssue('issue-3', 'medium', 250, 275, 'page 3 content')
            ]

            const { rerender } = render(
                <PdfViewer {...defaultProps} onIssueHighlight={onIssueHighlight} />
            )

            // Wait for PDF to load
            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            // Review each issue
            for (const issue of issues) {
                rerender(
                    <PdfViewer
                        {...defaultProps}
                        selectedIssue={issue}
                        onIssueHighlight={onIssueHighlight}
                    />
                )

                await waitFor(() => {
                    expect(onIssueHighlight).toHaveBeenCalledWith(issue, true)
                })

                // Zoom in to examine issue
                const zoomInButton = screen.getByText('In')
                await user.click(zoomInButton)

                // Zoom back out
                const zoomOutButton = screen.getByText('Out')
                await user.click(zoomOutButton)
            }

            // Navigate manually through document
            const nextButton = screen.getByText('Next')
            await user.click(nextButton)
            await user.click(nextButton)

            expect(screen.getByDisplayValue('3')).toBeInTheDocument()
        })

        it('should handle concurrent operations', async () => {
            const user = userEvent.setup()
            const onIssueHighlight = vi.fn()
            const issue = createMockIssue('issue-1', 'critical', 10, 25)

            const { rerender } = render(
                <PdfViewer {...defaultProps} onIssueHighlight={onIssueHighlight} />
            )

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            // Perform multiple operations simultaneously
            const promises = [
                // Select issue
                new Promise<void>((resolve) => {
                    rerender(
                        <PdfViewer
                            {...defaultProps}
                            selectedIssue={issue}
                            onIssueHighlight={onIssueHighlight}
                        />
                    )
                    resolve()
                }),

                // Navigate pages
                user.click(screen.getByText('Next')),

                // Zoom
                user.click(screen.getByText('In'))
            ]

            await Promise.all(promises)

            // Should handle all operations without conflicts
            expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
        })
    })
})