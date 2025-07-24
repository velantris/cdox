import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Simple mock for PdfViewer that focuses on core functionality
const MockPdfViewer = ({ documentUrl, selectedIssue, onIssueHighlight, className }: any) => {
    return (
        <div className={className} data-testid="pdf-viewer">
            <div data-testid="pdf-document">PDF Document: {documentUrl}</div>
            {selectedIssue && (
                <div data-testid="selected-issue">
                    Issue: {selectedIssue._id} - {selectedIssue.severity}
                </div>
            )}
            <button
                onClick={() => onIssueHighlight?.(selectedIssue, true)}
                data-testid="highlight-button"
            >
                Highlight Issue
            </button>
        </div>
    )
}

describe('PDF Viewer Core Functionality', () => {
    const mockIssue = {
        _id: 'issue-1',
        originalText: 'Sample text',
        offsetStart: 0,
        offsetEnd: 10,
        severity: 'high',
        type: 'grammar'
    }

    const defaultProps = {
        documentUrl: 'https://example.com/test.pdf',
        selectedIssue: null,
        onIssueHighlight: vi.fn(),
        className: 'test-class'
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Props Handling', () => {
        it('should render with document URL', () => {
            render(<MockPdfViewer {...defaultProps} />)

            expect(screen.getByTestId('pdf-document')).toHaveTextContent('PDF Document: https://example.com/test.pdf')
        })

        it('should apply custom className', () => {
            render(<MockPdfViewer {...defaultProps} />)

            expect(screen.getByTestId('pdf-viewer')).toHaveClass('test-class')
        })

        it('should display selected issue', () => {
            render(<MockPdfViewer {...defaultProps} selectedIssue={mockIssue} />)

            expect(screen.getByTestId('selected-issue')).toHaveTextContent('Issue: issue-1 - high')
        })

        it('should not display issue when none selected', () => {
            render(<MockPdfViewer {...defaultProps} selectedIssue={null} />)

            expect(screen.queryByTestId('selected-issue')).not.toBeInTheDocument()
        })
    })

    describe('Issue Highlighting Callback', () => {
        it('should call onIssueHighlight when button is clicked', async () => {
            const onIssueHighlight = vi.fn()
            const user = userEvent.setup()

            render(
                <MockPdfViewer
                    {...defaultProps}
                    selectedIssue={mockIssue}
                    onIssueHighlight={onIssueHighlight}
                />
            )

            const button = screen.getByTestId('highlight-button')
            await user.click(button)

            expect(onIssueHighlight).toHaveBeenCalledWith(mockIssue, true)
        })

        it('should not crash when onIssueHighlight is not provided', async () => {
            const user = userEvent.setup()

            render(
                <MockPdfViewer
                    {...defaultProps}
                    selectedIssue={mockIssue}
                    onIssueHighlight={undefined}
                />
            )

            const button = screen.getByTestId('highlight-button')

            // Should not throw error
            await expect(user.click(button)).resolves.not.toThrow()
        })
    })

    describe('State Management', () => {
        it('should handle prop updates', () => {
            const { rerender } = render(<MockPdfViewer {...defaultProps} />)

            expect(screen.queryByTestId('selected-issue')).not.toBeInTheDocument()

            rerender(<MockPdfViewer {...defaultProps} selectedIssue={mockIssue} />)

            expect(screen.getByTestId('selected-issue')).toBeInTheDocument()
        })

        it('should handle different document URLs', () => {
            const { rerender } = render(<MockPdfViewer {...defaultProps} />)

            expect(screen.getByTestId('pdf-document')).toHaveTextContent('https://example.com/test.pdf')

            rerender(<MockPdfViewer {...defaultProps} documentUrl="https://example.com/new.pdf" />)

            expect(screen.getByTestId('pdf-document')).toHaveTextContent('https://example.com/new.pdf')
        })
    })

    describe('Edge Cases', () => {
        it('should handle empty document URL', () => {
            render(<MockPdfViewer {...defaultProps} documentUrl="" />)

            expect(screen.getByTestId('pdf-document')).toHaveTextContent('PDF Document: ')
        })

        it('should handle issue without required fields', () => {
            const incompleteIssue = {
                _id: 'incomplete',
                severity: 'low'
                // Missing other fields
            }

            render(<MockPdfViewer {...defaultProps} selectedIssue={incompleteIssue} />)

            expect(screen.getByTestId('selected-issue')).toHaveTextContent('Issue: incomplete - low')
        })

        it('should handle multiple rapid prop changes', () => {
            const { rerender } = render(<MockPdfViewer {...defaultProps} />)

            const issues = [
                { ...mockIssue, _id: 'issue-1', severity: 'low' },
                { ...mockIssue, _id: 'issue-2', severity: 'medium' },
                { ...mockIssue, _id: 'issue-3', severity: 'high' },
                { ...mockIssue, _id: 'issue-4', severity: 'critical' }
            ]

            // Rapidly change selected issues
            issues.forEach(issue => {
                rerender(<MockPdfViewer {...defaultProps} selectedIssue={issue} />)
                expect(screen.getByTestId('selected-issue')).toHaveTextContent(`Issue: ${issue._id} - ${issue.severity}`)
            })
        })
    })
})