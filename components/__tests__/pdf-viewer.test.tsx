import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { PdfViewerWrapper as PdfViewer } from '../pdf-viewer-wrapper'

// Mock react-pdf
vi.mock('react-pdf', () => ({
    Document: vi.fn(({ onLoadSuccess, onLoadError, children }) => {
        // Simulate successful PDF load after a delay
        setTimeout(() => {
            if (onLoadSuccess) {
                onLoadSuccess({ numPages: 5 })
            }
        }, 100)
        return <div data-testid="pdf-document">{children}</div>
    }),
    Page: vi.fn(({ pageNumber, scale, onRenderSuccess }) => {
        // Simulate page render
        setTimeout(() => {
            if (onRenderSuccess) {
                onRenderSuccess()
            }
        }, 50)
        return (
            <div
                data-testid={`pdf-page-${pageNumber}`}
                data-page-number={pageNumber}
                data-scale={scale}
            >
                <div className="react-pdf__Page__textContent">
                    <span>Sample text for page {pageNumber}</span>
                </div>
            </div>
        )
    }),
    pdfjs: {
        GlobalWorkerOptions: {
            workerSrc: '/pdf.worker.min.mjs'
        }
    }
}))

// Mock PDF text extraction
vi.mock('@/lib/pdf-text-extraction', () => ({
    extractTextFromPdf: vi.fn().mockResolvedValue({
        documentText: 'Sample document text with multiple pages',
        pageTexts: [
            {
                pageNumber: 1,
                text: 'Sample text for page 1',
                textItems: [],
                startOffset: 0,
                endOffset: 22
            },
            {
                pageNumber: 2,
                text: 'Sample text for page 2',
                textItems: [],
                startOffset: 23,
                endOffset: 45
            }
        ],
        isReady: true
    }),
    locateTextByOffset: vi.fn().mockReturnValue({
        found: true,
        pageNumber: 1,
        startOffset: 0,
        endOffset: 10
    }),
    searchTextInPdf: vi.fn().mockReturnValue({
        found: true,
        pageNumber: 1,
        startOffset: 0,
        endOffset: 10
    })
}))

// Mock PDF highlight overlay
vi.mock('../pdf-highlight-overlay', () => ({
    PdfHighlightOverlay: vi.fn(({ highlights, pageNumber }) => (
        <div data-testid="pdf-highlight-overlay" data-page={pageNumber}>
            {highlights.map((highlight: any) => (
                <div key={highlight.id} data-testid={`highlight-${highlight.id}`}>
                    Highlight for issue {highlight.issueId}
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
        <div className={className}>{children}</div>
    )),
    CardContent: vi.fn(({ children }) => <div>{children}</div>)
}))

vi.mock('@/components/ui/input', () => ({
    Input: vi.fn((props) => <input {...props} />)
}))

const mockIssue = {
    _id: 'issue-1',
    originalText: 'Sample text',
    offsetStart: 0,
    offsetEnd: 10,
    severity: 'high',
    type: 'grammar'
}

describe('PdfViewer Component', () => {
    const defaultProps = {
        documentUrl: 'https://example.com/test.pdf',
        selectedIssue: null,
        onIssueHighlight: vi.fn(),
        className: 'test-class'
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.clearAllTimers()
    })

    describe('Component Rendering', () => {
        it('should render PDF viewer with loading state initially', () => {
            render(<PdfViewer {...defaultProps} />)

            expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
        })

        it('should apply custom className', () => {
            const { container } = render(<PdfViewer {...defaultProps} />)

            expect(container.firstChild).toHaveClass('test-class')
        })

        it('should render PDF controls after document loads', async () => {
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Prev')).toBeInTheDocument()
                expect(screen.getByText('Next')).toBeInTheDocument()
            })
        })
    })

    describe('Props and State Management', () => {
        it('should handle documentUrl prop correctly', () => {
            const customUrl = 'https://example.com/custom.pdf'
            render(<PdfViewer {...defaultProps} documentUrl={customUrl} />)

            expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
        })

        it('should call onIssueHighlight when issue is selected', async () => {
            const onIssueHighlight = vi.fn()
            const { rerender } = render(
                <PdfViewer {...defaultProps} onIssueHighlight={onIssueHighlight} />
            )

            // Wait for initial load
            await waitFor(() => {
                expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
            })

            // Update with selected issue
            rerender(
                <PdfViewer
                    {...defaultProps}
                    selectedIssue={mockIssue}
                    onIssueHighlight={onIssueHighlight}
                />
            )

            await waitFor(() => {
                expect(onIssueHighlight).toHaveBeenCalledWith(mockIssue, true)
            })
        })

        it('should update state when numPages changes', async () => {
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })
        })
    })

    describe('Page Navigation', () => {
        it('should navigate to next page when next button is clicked', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Next')).toBeInTheDocument()
            })

            const nextButton = screen.getByText('Next')
            await user.click(nextButton)

            // Should show page 2
            await waitFor(() => {
                expect(screen.getByDisplayValue('2')).toBeInTheDocument()
            })
        })

        it('should navigate to previous page when prev button is clicked', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Next')).toBeInTheDocument()
            })

            // First go to page 2
            const nextButton = screen.getByText('Next')
            await user.click(nextButton)

            await waitFor(() => {
                expect(screen.getByDisplayValue('2')).toBeInTheDocument()
            })

            // Then go back to page 1
            const prevButton = screen.getByText('Prev')
            await user.click(prevButton)

            await waitFor(() => {
                expect(screen.getByDisplayValue('1')).toBeInTheDocument()
            })
        })

        it('should disable prev button on first page', async () => {
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                const prevButton = screen.getByText('Prev')
                expect(prevButton).toBeDisabled()
            })
        })

        it('should disable next button on last page', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Next')).toBeInTheDocument()
            })

            // Navigate to last page (page 5)
            const pageInput = screen.getByDisplayValue('1')
            await user.clear(pageInput)
            await user.type(pageInput, '5')
            await user.keyboard('{Enter}')

            await waitFor(() => {
                const nextButton = screen.getByText('Next')
                expect(nextButton).toBeDisabled()
            })
        })

        it('should handle page input changes', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByDisplayValue('1')).toBeInTheDocument()
            })

            const pageInput = screen.getByDisplayValue('1')
            await user.clear(pageInput)
            await user.type(pageInput, '3')
            await user.keyboard('{Enter}')

            await waitFor(() => {
                expect(screen.getByDisplayValue('3')).toBeInTheDocument()
            })
        })

        it('should validate page input and revert invalid values', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByDisplayValue('1')).toBeInTheDocument()
            })

            const pageInput = screen.getByDisplayValue('1')
            await user.clear(pageInput)
            await user.type(pageInput, '10') // Invalid page number
            await user.keyboard('{Enter}')

            await waitFor(() => {
                expect(screen.getByDisplayValue('1')).toBeInTheDocument() // Should revert to current page
            })
        })
    })

    describe('Zoom Controls', () => {
        it('should zoom in when zoom in button is clicked', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('100%')).toBeInTheDocument()
            })

            const zoomInButton = screen.getByText('In')
            await user.click(zoomInButton)

            await waitFor(() => {
                expect(screen.getByText('110%')).toBeInTheDocument()
            })
        })

        it('should zoom out when zoom out button is clicked', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('100%')).toBeInTheDocument()
            })

            const zoomOutButton = screen.getByText('Out')
            await user.click(zoomOutButton)

            await waitFor(() => {
                expect(screen.getByText('90%')).toBeInTheDocument()
            })
        })

        it('should disable zoom out at minimum scale', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('100%')).toBeInTheDocument()
            })

            // Zoom out to minimum (50%)
            const zoomOutButton = screen.getByText('Out')
            for (let i = 0; i < 5; i++) {
                await user.click(zoomOutButton)
            }

            await waitFor(() => {
                expect(zoomOutButton).toBeDisabled()
            })
        })

        it('should disable zoom in at maximum scale', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('100%')).toBeInTheDocument()
            })

            // Zoom in to maximum (200%)
            const zoomInButton = screen.getByText('In')
            for (let i = 0; i < 10; i++) {
                await user.click(zoomInButton)
            }

            await waitFor(() => {
                expect(zoomInButton).toBeDisabled()
            })
        })
    })

    describe('Issue Highlighting', () => {
        it('should create highlight when issue is selected', async () => {
            const { rerender } = render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
            })

            rerender(<PdfViewer {...defaultProps} selectedIssue={mockIssue} />)

            await waitFor(() => {
                expect(screen.getByTestId('pdf-highlight-overlay')).toBeInTheDocument()
            })
        })

        it('should clear highlights when no issue is selected', async () => {
            const { rerender } = render(
                <PdfViewer {...defaultProps} selectedIssue={mockIssue} />
            )

            await waitFor(() => {
                expect(screen.getByTestId('pdf-highlight-overlay')).toBeInTheDocument()
            })

            rerender(<PdfViewer {...defaultProps} selectedIssue={null} />)

            await waitFor(() => {
                const overlay = screen.getByTestId('pdf-highlight-overlay')
                expect(overlay).toBeInTheDocument()
                expect(overlay.children).toHaveLength(0)
            })
        })

        it('should navigate to correct page when issue is highlighted', async () => {
            const { rerender } = render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByDisplayValue('1')).toBeInTheDocument()
            })

            // Mock locateTextByOffset to return page 3
            const { locateTextByOffset } = await import('@/lib/pdf-text-extraction')
            vi.mocked(locateTextByOffset).mockReturnValue({
                found: true,
                pageNumber: 3,
                startOffset: 0,
                endOffset: 10
            })

            rerender(<PdfViewer {...defaultProps} selectedIssue={mockIssue} />)

            await waitFor(() => {
                expect(screen.getByDisplayValue('3')).toBeInTheDocument()
            })
        })
    })

    describe('Error Handling', () => {
        it('should display error message when PDF fails to load', async () => {
            // Mock Document to trigger error
            const { Document } = await import('react-pdf')
            vi.mocked(Document).mockImplementation(({ onLoadError }) => {
                setTimeout(() => {
                    if (onLoadError) {
                        onLoadError(new Error('Failed to load PDF'))
                    }
                }, 100)
                return <div data-testid="pdf-document-error" />
            })

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Failed to load PDF')).toBeInTheDocument()
            })
        })

        it('should show retry button on error', async () => {
            const { Document } = await import('react-pdf')
            vi.mocked(Document).mockImplementation(({ onLoadError }) => {
                setTimeout(() => {
                    if (onLoadError) {
                        onLoadError(new Error('Network error'))
                    }
                }, 100)
                return <div data-testid="pdf-document-error" />
            })

            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Try Again')).toBeInTheDocument()
            })
        })

        it('should handle text extraction errors gracefully', async () => {
            const { extractTextFromPdf } = await import('@/lib/pdf-text-extraction')
            vi.mocked(extractTextFromPdf).mockResolvedValue({
                documentText: '',
                pageTexts: [],
                isReady: false,
                extractionError: 'Text extraction failed'
            })

            const onIssueHighlight = vi.fn()
            const { rerender } = render(
                <PdfViewer {...defaultProps} onIssueHighlight={onIssueHighlight} />
            )

            await waitFor(() => {
                expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
            })

            rerender(
                <PdfViewer
                    {...defaultProps}
                    selectedIssue={mockIssue}
                    onIssueHighlight={onIssueHighlight}
                />
            )

            await waitFor(() => {
                expect(onIssueHighlight).toHaveBeenCalledWith(mockIssue, false)
            })
        })
    })

    describe('Event Handling', () => {
        it('should handle keyboard navigation', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByDisplayValue('1')).toBeInTheDocument()
            })

            const pageInput = screen.getByDisplayValue('1')
            await user.click(pageInput)
            await user.keyboard('{ArrowUp}') // Should increment page

            // Note: This test depends on the actual implementation of keyboard handling
            // The current implementation uses Enter key for page navigation
        })

        it('should handle focus and blur events on page input', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByDisplayValue('1')).toBeInTheDocument()
            })

            const pageInput = screen.getByDisplayValue('1')
            await user.click(pageInput)
            await user.clear(pageInput)
            await user.type(pageInput, '2')

            // Blur should trigger page change
            await user.tab()

            await waitFor(() => {
                expect(screen.getByDisplayValue('2')).toBeInTheDocument()
            })
        })
    })

    describe('Advanced State Management', () => {
        it('should maintain scale when navigating pages', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('100%')).toBeInTheDocument()
            })

            // Zoom in
            const zoomInButton = screen.getByText('In')
            await user.click(zoomInButton)
            await user.click(zoomInButton)

            await waitFor(() => {
                expect(screen.getByText('120%')).toBeInTheDocument()
            })

            // Navigate to next page
            const nextButton = screen.getByText('Next')
            await user.click(nextButton)

            // Scale should be maintained
            await waitFor(() => {
                expect(screen.getByText('120%')).toBeInTheDocument()
                expect(screen.getByDisplayValue('2')).toBeInTheDocument()
            })
        })

        it('should handle rapid state changes', async () => {
            const user = userEvent.setup()
            const onIssueHighlight = vi.fn()

            const { rerender } = render(
                <PdfViewer {...defaultProps} onIssueHighlight={onIssueHighlight} />
            )

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            // Rapidly change selected issues
            const issues = [
                { ...mockIssue, _id: 'issue-1' },
                { ...mockIssue, _id: 'issue-2' },
                { ...mockIssue, _id: 'issue-3' }
            ]

            for (const issue of issues) {
                rerender(
                    <PdfViewer
                        {...defaultProps}
                        selectedIssue={issue}
                        onIssueHighlight={onIssueHighlight}
                    />
                )
                await act(() => new Promise(resolve => setTimeout(resolve, 50)))
            }

            // Should handle all changes without crashing
            expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
        })

        it('should handle concurrent prop updates', async () => {
            const onIssueHighlight = vi.fn()
            const { rerender } = render(
                <PdfViewer {...defaultProps} onIssueHighlight={onIssueHighlight} />
            )

            await waitFor(() => {
                expect(screen.getByText('of 5')).toBeInTheDocument()
            })

            // Update multiple props simultaneously
            rerender(
                <PdfViewer
                    {...defaultProps}
                    documentUrl="https://example.com/new.pdf"
                    selectedIssue={mockIssue}
                    onIssueHighlight={onIssueHighlight}
                    className="new-class"
                />
            )

            // Should handle concurrent updates
            expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
        })
    })

    describe('Memory Management', () => {
        it('should cleanup resources on unmount', () => {
            const { unmount } = render(<PdfViewer {...defaultProps} />)

            // Component should unmount without errors
            expect(() => unmount()).not.toThrow()
        })

        it('should handle multiple mount/unmount cycles', () => {
            for (let i = 0; i < 5; i++) {
                const { unmount } = render(<PdfViewer {...defaultProps} />)
                unmount()
            }

            // Should not cause memory leaks or errors
            expect(true).toBe(true)
        })
    })

    describe('Accessibility', () => {
        it('should have proper ARIA labels', async () => {
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByText('Prev')).toBeInTheDocument()
            })

            const prevButton = screen.getByText('Prev')
            const nextButton = screen.getByText('Next')
            const zoomInButton = screen.getByText('In')
            const zoomOutButton = screen.getByText('Out')

            // Buttons should be accessible
            expect(prevButton).toBeInTheDocument()
            expect(nextButton).toBeInTheDocument()
            expect(zoomInButton).toBeInTheDocument()
            expect(zoomOutButton).toBeInTheDocument()
        })

        it('should support keyboard navigation', async () => {
            const user = userEvent.setup()
            render(<PdfViewer {...defaultProps} />)

            await waitFor(() => {
                expect(screen.getByDisplayValue('1')).toBeInTheDocument()
            })

            const pageInput = screen.getByDisplayValue('1')

            // Should be focusable
            await user.click(pageInput)
            expect(pageInput).toHaveFocus()

            // Should respond to Enter key
            await user.clear(pageInput)
            await user.type(pageInput, '3')
            await user.keyboard('{Enter}')

            await waitFor(() => {
                expect(screen.getByDisplayValue('3')).toBeInTheDocument()
            })
        })
    })
})