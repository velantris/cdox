import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { PdfHighlightOverlay, type Highlight } from '../pdf-highlight-overlay'

// Mock the utility function
vi.mock('@/lib/utils', () => ({
    cn: vi.fn((...classes) => classes.filter(Boolean).join(' '))
}))

// Helper function to wait for highlight elements to be rendered
const getHighlightElement = (id: string) => document.querySelector(`[data-highlight-id="${id}"]`) as HTMLElement

const mockHighlights: Highlight[] = [
    {
        id: 'highlight-1',
        issueId: 'issue-1',
        startOffset: 0,
        endOffset: 10,
        pageNumber: 1,
        severity: 'critical',
        boundingRect: {
            x: 10,
            y: 20,
            width: 100,
            height: 20
        }
    },
    {
        id: 'highlight-2',
        issueId: 'issue-2',
        startOffset: 15,
        endOffset: 25,
        pageNumber: 1,
        severity: 'high',
        boundingRect: {
            x: 120,
            y: 20,
            width: 80,
            height: 20
        }
    },
    {
        id: 'highlight-3',
        issueId: 'issue-3',
        startOffset: 30,
        endOffset: 40,
        pageNumber: 2,
        severity: 'medium',
        boundingRect: {
            x: 150,
            y: 30,
            width: 70,
            height: 20
        }
    }
]

describe('PdfHighlightOverlay Component', () => {
    const mockPageRef = {
        current: {
            querySelector: vi.fn().mockReturnValue({
                querySelectorAll: vi.fn().mockReturnValue([
                    {
                        textContent: 'Sample text content for testing',
                        firstChild: {
                            nodeType: 3, // TEXT_NODE
                            textContent: 'Sample text content for testing'
                        },
                        getBoundingClientRect: vi.fn().mockReturnValue({
                            left: 0,
                            top: 0,
                            width: 200,
                            height: 40
                        })
                    }
                ])
            }),
            getBoundingClientRect: vi.fn().mockReturnValue({
                left: 0,
                top: 0,
                width: 400,
                height: 600
            })
        }
    }

    const defaultProps = {
        highlights: mockHighlights,
        pageNumber: 1,
        scale: 1.0,
        pageRef: mockPageRef,
        onHighlightClick: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()

        // Mock document.createRange
        global.Range = class Range {
            setStart = vi.fn()
            setEnd = vi.fn()
            setStartBefore = vi.fn()
            setEndAfter = vi.fn()
            selectNode = vi.fn()
            getBoundingClientRect = vi.fn().mockReturnValue({
                left: 10,
                top: 20,
                width: 100,
                height: 20
            })
        }

        Object.defineProperty(document, 'createRange', {
            value: () => new Range(),
            writable: true
        })
    })

    describe('Component Rendering', () => {
        it('should render highlight overlay container', () => {
            const { container } = render(<PdfHighlightOverlay {...defaultProps} />)

            expect(container.firstChild).toHaveClass('absolute', 'inset-0', 'pointer-events-none')
        })

        it('should render highlights for current page only', async () => {
            render(<PdfHighlightOverlay {...defaultProps} pageNumber={1} />)

            // Should render 2 highlights for page 1 (highlight-1 and highlight-2)
            await waitFor(() => {
                expect(document.querySelector('[data-highlight-id="highlight-1"]')).toBeInTheDocument()
                expect(document.querySelector('[data-highlight-id="highlight-2"]')).toBeInTheDocument()
                expect(document.querySelector('[data-highlight-id="highlight-3"]')).not.toBeInTheDocument()
            })
        })

        it('should not render highlights for different page', async () => {
            render(<PdfHighlightOverlay {...defaultProps} pageNumber={2} />)

            // Should only render highlight-3 for page 2
            await waitFor(() => {
                expect(document.querySelector('[data-highlight-id="highlight-1"]')).not.toBeInTheDocument()
                expect(document.querySelector('[data-highlight-id="highlight-2"]')).not.toBeInTheDocument()
                expect(document.querySelector('[data-highlight-id="highlight-3"]')).toBeInTheDocument()
            })
        })

        it('should render empty overlay when no highlights', () => {
            const { container } = render(
                <PdfHighlightOverlay {...defaultProps} highlights={[]} />
            )

            expect(container.firstChild?.children).toHaveLength(0)
        })
    })

    describe('Highlight Positioning and Scaling', () => {
        it('should apply correct positioning based on boundingRect and scale', async () => {
            render(<PdfHighlightOverlay {...defaultProps} scale={1.5} />)

            await waitFor(() => {
                const highlight = getHighlightElement('highlight-1')
                expect(highlight).toBeInTheDocument()

                // Position should be scaled: x=10*1.5=15, y=20*1.5=30
                expect(highlight).toHaveStyle({
                    left: '15px',
                    top: '30px',
                    width: '150px', // 100*1.5
                    height: '30px'  // 20*1.5
                })
            })
        })

        it('should handle different scales correctly', async () => {
            const { rerender } = render(<PdfHighlightOverlay {...defaultProps} scale={0.5} />)

            await waitFor(() => {
                let highlight = getHighlightElement('highlight-1')
                expect(highlight).toHaveStyle({
                    left: '5px',   // 10*0.5
                    top: '10px',   // 20*0.5
                    width: '50px', // 100*0.5
                    height: '10px' // 20*0.5
                })
            })

            rerender(<PdfHighlightOverlay {...defaultProps} scale={2.0} />)

            await waitFor(() => {
                let highlight = getHighlightElement('highlight-1')
                expect(highlight).toHaveStyle({
                    left: '20px',   // 10*2.0
                    top: '40px',    // 20*2.0
                    width: '200px', // 100*2.0
                    height: '40px'  // 20*2.0
                })
            })
        })
    })

    describe('Severity-based Styling', () => {
        it('should apply critical severity styling', async () => {
            render(<PdfHighlightOverlay {...defaultProps} />)

            await waitFor(() => {
                const criticalHighlight = getHighlightElement('highlight-1')
                expect(criticalHighlight).toBeInTheDocument()

                // Should have critical severity styling
                expect(criticalHighlight).toHaveStyle({
                    borderColor: '#dc2626'
                })
            })
        })

        it('should apply high severity styling', () => {
            render(<PdfHighlightOverlay {...defaultProps} />)

            const highHighlight = getHighlightElement('highlight-2')

            // Should have high severity styling
            expect(highHighlight).toHaveStyle({
                borderColor: '#ea580c'
            })
        })

        it('should apply different colors for different severities', () => {
            const highlights: Highlight[] = [
                { ...mockHighlights[0], severity: 'low', id: 'low-highlight' },
                { ...mockHighlights[0], severity: 'medium', id: 'medium-highlight' },
                { ...mockHighlights[0], severity: 'high', id: 'high-highlight' },
                { ...mockHighlights[0], severity: 'critical', id: 'critical-highlight' }
            ]

            render(<PdfHighlightOverlay {...defaultProps} highlights={highlights} />)

            expect(getHighlightElement('highlight-low-highlight')).toHaveStyle({
                borderColor: '#16a34a' // Green for low
            })
            expect(getHighlightElement('highlight-medium-highlight')).toHaveStyle({
                borderColor: '#facc15' // Yellow for medium
            })
            expect(getHighlightElement('highlight-high-highlight')).toHaveStyle({
                borderColor: '#ea580c' // Orange for high
            })
            expect(getHighlightElement('highlight-critical-highlight')).toHaveStyle({
                borderColor: '#dc2626' // Red for critical
            })
        })
    })

    describe('Interactive Behavior', () => {
        it('should call onHighlightClick when highlight is clicked', async () => {
            const onHighlightClick = vi.fn()
            const user = userEvent.setup()

            render(
                <PdfHighlightOverlay
                    {...defaultProps}
                    onHighlightClick={onHighlightClick}
                />
            )

            const highlight = getHighlightElement('highlight-1')
            await user.click(highlight)

            expect(onHighlightClick).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'highlight-1',
                    issueId: 'issue-1',
                    severity: 'critical'
                })
            )
        })

        it('should not call onHighlightClick when callback is not provided', async () => {
            const user = userEvent.setup()

            render(<PdfHighlightOverlay {...defaultProps} onHighlightClick={undefined} />)

            const highlight = getHighlightElement('highlight-1')

            // Should not throw error when clicked without callback
            await expect(user.click(highlight)).resolves.not.toThrow()
        })

        it('should show hover effects on mouse enter', async () => {
            const user = userEvent.setup()

            render(<PdfHighlightOverlay {...defaultProps} />)

            const highlight = getHighlightElement('highlight-1')

            await user.hover(highlight)

            // Should have hover class or styling applied
            expect(highlight).toHaveClass('scale-105')
        })

        it('should remove hover effects on mouse leave', async () => {
            const user = userEvent.setup()

            render(<PdfHighlightOverlay {...defaultProps} />)

            const highlight = getHighlightElement('highlight-1')

            await user.hover(highlight)
            expect(highlight).toHaveClass('scale-105')

            await user.unhover(highlight)
            expect(highlight).not.toHaveClass('scale-105')
        })
    })

    describe('Tooltip and Visual Feedback', () => {
        it('should show tooltip with severity information on hover', async () => {
            const user = userEvent.setup()

            render(<PdfHighlightOverlay {...defaultProps} />)

            const highlight = getHighlightElement('highlight-1')

            await user.hover(highlight)

            // Should show tooltip with severity info
            await waitFor(() => {
                expect(screen.getByText('Critical Issue')).toBeInTheDocument()
            })
        })

        it('should show severity badge on hover', async () => {
            const user = userEvent.setup()

            render(<PdfHighlightOverlay {...defaultProps} />)

            const highlight = getHighlightElement('highlight-1')

            await user.hover(highlight)

            // Should show severity badge with emoji
            await waitFor(() => {
                expect(screen.getByText('⚠️')).toBeInTheDocument()
            })
        })

        it('should show different emojis for different severities', async () => {
            const highlights: Highlight[] = [
                { ...mockHighlights[0], severity: 'low', id: 'low-highlight' },
                { ...mockHighlights[0], severity: 'medium', id: 'medium-highlight', boundingRect: { x: 200, y: 20, width: 100, height: 20 } },
                { ...mockHighlights[0], severity: 'high', id: 'high-highlight', boundingRect: { x: 300, y: 20, width: 100, height: 20 } },
                { ...mockHighlights[0], severity: 'critical', id: 'critical-highlight', boundingRect: { x: 400, y: 20, width: 100, height: 20 } }
            ]

            const user = userEvent.setup()

            render(<PdfHighlightOverlay {...defaultProps} highlights={highlights} />)

            // Test each severity emoji
            await user.hover(getHighlightElement('highlight-low-highlight'))
            await waitFor(() => expect(screen.getByText('✅')).toBeInTheDocument())

            await user.hover(getHighlightElement('highlight-medium-highlight'))
            await waitFor(() => expect(screen.getByText('⚡')).toBeInTheDocument())

            await user.hover(getHighlightElement('highlight-high-highlight'))
            await waitFor(() => expect(screen.getByText('🔶')).toBeInTheDocument())

            await user.hover(getHighlightElement('highlight-critical-highlight'))
            await waitFor(() => expect(screen.getByText('⚠️')).toBeInTheDocument())
        })
    })

    describe('Animation and Visual Effects', () => {
        it('should apply pulse animation to critical highlights', () => {
            render(<PdfHighlightOverlay {...defaultProps} />)

            const criticalHighlight = getHighlightElement('highlight-1')

            expect(criticalHighlight).toHaveClass('highlight-pulse')
        })

        it('should apply subtle pulse to high severity highlights', () => {
            render(<PdfHighlightOverlay {...defaultProps} />)

            const highHighlight = getHighlightElement('highlight-2')

            expect(highHighlight).toHaveClass('animate-pulse')
        })

        it('should show ripple effect on click', async () => {
            const user = userEvent.setup()

            render(<PdfHighlightOverlay {...defaultProps} />)

            const highlight = getHighlightElement('highlight-1')
            await user.click(highlight)

            // Should temporarily have ripple class
            expect(highlight).toHaveClass('highlight-ripple')
        })
    })

    describe('Text Bounding Calculation', () => {
        it('should handle highlights without boundingRect', async () => {
            const highlightsWithoutRect: Highlight[] = [
                {
                    id: 'highlight-no-rect',
                    issueId: 'issue-no-rect',
                    startOffset: 0,
                    endOffset: 10,
                    pageNumber: 1,
                    severity: 'medium'
                    // No boundingRect property
                }
            ]

            render(
                <PdfHighlightOverlay
                    {...defaultProps}
                    highlights={highlightsWithoutRect}
                />
            )

            // Should attempt to calculate bounding rect
            await waitFor(() => {
                // The component should try to calculate position
                expect(mockPageRef.current.querySelector).toHaveBeenCalled()
            })
        })

        it('should handle missing text layer gracefully', () => {
            const pageRefWithoutTextLayer = {
                current: {
                    querySelector: vi.fn().mockReturnValue(null),
                    getBoundingClientRect: vi.fn().mockReturnValue({
                        left: 0,
                        top: 0,
                        width: 400,
                        height: 600
                    })
                }
            }

            render(
                <PdfHighlightOverlay
                    {...defaultProps}
                    pageRef={pageRefWithoutTextLayer}
                />
            )

            // Should not crash when text layer is missing
            expect(getHighlightElement('highlight-1')).toBeInTheDocument()
        })
    })

    describe('Edge Cases', () => {
        it('should handle empty highlights array', () => {
            const { container } = render(
                <PdfHighlightOverlay {...defaultProps} highlights={[]} />
            )

            expect(container.firstChild?.children).toHaveLength(0)
        })

        it('should handle null pageRef', () => {
            const nullPageRef = { current: null }

            render(
                <PdfHighlightOverlay {...defaultProps} pageRef={nullPageRef} />
            )

            // Should not crash with null pageRef
            expect(getHighlightElement('highlight-1')).toBeInTheDocument()
        })

        it('should handle zero scale', () => {
            render(<PdfHighlightOverlay {...defaultProps} scale={0} />)

            const highlight = getHighlightElement('highlight-1')

            expect(highlight).toHaveStyle({
                left: '0px',
                top: '0px',
                width: '0px',
                height: '0px'
            })
        })

        it('should handle negative page numbers', () => {
            render(<PdfHighlightOverlay {...defaultProps} pageNumber={-1} />)

            // Should not render any highlights for invalid page number
            expect(screen.queryByTestId('highlight-highlight-1')).not.toBeInTheDocument()
            expect(screen.queryByTestId('highlight-highlight-2')).not.toBeInTheDocument()
        })

        it('should handle very large scale values', () => {
            render(<PdfHighlightOverlay {...defaultProps} scale={10} />)

            const highlight = getHighlightElement('highlight-1')

            expect(highlight).toHaveStyle({
                left: '100px',  // 10 * 10
                top: '200px',   // 20 * 10
                width: '1000px', // 100 * 10
                height: '200px'  // 20 * 10
            })
        })

        it('should handle highlights with missing boundingRect', () => {
            const highlightsWithoutRect: Highlight[] = [
                {
                    id: 'highlight-no-rect',
                    issueId: 'issue-no-rect',
                    startOffset: 0,
                    endOffset: 10,
                    pageNumber: 1,
                    severity: 'medium'
                }
            ]

            render(
                <PdfHighlightOverlay
                    {...defaultProps}
                    highlights={highlightsWithoutRect}
                />
            )

            // Should attempt to render but may not be visible without boundingRect
            expect(screen.queryByTestId('highlight-highlight-no-rect')).toBeInTheDocument()
        })
    })

    describe('Performance and Optimization', () => {
        it('should handle large numbers of highlights efficiently', () => {
            const manyHighlights: Highlight[] = Array.from({ length: 100 }, (_, i) => ({
                id: `highlight-${i}`,
                issueId: `issue-${i}`,
                startOffset: i * 10,
                endOffset: i * 10 + 5,
                pageNumber: 1,
                severity: 'medium' as const,
                boundingRect: {
                    x: i * 20,
                    y: 20,
                    width: 100,
                    height: 20
                }
            }))

            const startTime = performance.now()
            render(
                <PdfHighlightOverlay
                    {...defaultProps}
                    highlights={manyHighlights}
                />
            )
            const endTime = performance.now()

            // Should render efficiently
            expect(endTime - startTime).toBeLessThan(1000)
            expect(getHighlightElement('highlight-0')).toBeInTheDocument()
            expect(getHighlightElement('highlight-99')).toBeInTheDocument()
        })

        it('should update efficiently when highlights change', () => {
            const initialHighlights = [mockHighlights[0]]
            const { rerender } = render(
                <PdfHighlightOverlay
                    {...defaultProps}
                    highlights={initialHighlights}
                />
            )

            expect(getHighlightElement('highlight-1')).toBeInTheDocument()

            const startTime = performance.now()
            rerender(
                <PdfHighlightOverlay
                    {...defaultProps}
                    highlights={mockHighlights}
                />
            )
            const endTime = performance.now()

            // Should update efficiently
            expect(endTime - startTime).toBeLessThan(100)
            expect(getHighlightElement('highlight-2')).toBeInTheDocument()
        })
    })

    describe('Integration with Text Layer', () => {
        it('should calculate bounding rects when text layer is available', async () => {
            const highlightsWithoutRect: Highlight[] = [
                {
                    id: 'highlight-calc',
                    issueId: 'issue-calc',
                    startOffset: 0,
                    endOffset: 10,
                    pageNumber: 1,
                    severity: 'high'
                }
            ]

            render(
                <PdfHighlightOverlay
                    {...defaultProps}
                    highlights={highlightsWithoutRect}
                />
            )

            // Should attempt to calculate bounding rect
            await waitFor(() => {
                expect(mockPageRef.current.querySelector).toHaveBeenCalled()
            })
        })

        it('should handle text layer calculation errors gracefully', () => {
            const pageRefWithError = {
                current: {
                    querySelector: vi.fn().mockImplementation(() => {
                        throw new Error('Text layer error')
                    }),
                    getBoundingClientRect: vi.fn().mockReturnValue({
                        left: 0,
                        top: 0,
                        width: 400,
                        height: 600
                    })
                }
            }

            expect(() => {
                render(
                    <PdfHighlightOverlay
                        {...defaultProps}
                        pageRef={pageRefWithError}
                    />
                )
            }).not.toThrow()
        })
    })
})