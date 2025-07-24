import { describe, it, expect, vi } from 'vitest'
import {
    extractTextFromPdf,
    locateTextByOffset,
    searchTextInPdf,
    getPageForOffset,
    type PdfTextExtractor
} from '../pdf-text-extraction'

// Mock pdfjs-dist with more realistic behavior for integration testing
vi.mock('pdfjs-dist', () => {
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
        getDocument: vi.fn().mockImplementation((url: string) => ({
            promise: new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (mockLoadError) {
                        reject(mockLoadError)
                    } else {
                        resolve(mockDocument)
                    }
                }, mockLoadDelay)
            })
        })),
        // Test utilities
        __setMockNumPages: (pages: number) => { mockNumPages = pages },
        __setMockLoadError: (error: Error | null) => { mockLoadError = error },
        __setMockLoadDelay: (delay: number) => { mockLoadDelay = delay }
    }
})

describe('PDF Integration Tests', () => {
    describe('PDF Loading with Different Document Formats', () => {
        it('should handle successful PDF loading', async () => {
            const result = await extractTextFromPdf('https://example.com/test.pdf')

            expect(result.isReady).toBe(true)
            expect(result.documentText).toContain('This is page 1 content')
            expect(result.pageTexts).toHaveLength(5)
            expect(result.pageTexts[0].pageNumber).toBe(1)
        })

        it('should handle large PDF documents', async () => {
            const { __setMockNumPages } = await import('pdfjs-dist')
            __setMockNumPages(100)

            const result = await extractTextFromPdf('https://example.com/large.pdf')

            expect(result.isReady).toBe(true)
            expect(result.pageTexts).toHaveLength(100)
            expect(result.pageTexts[99].pageNumber).toBe(100)
        })

        it('should handle single page PDF', async () => {
            const { __setMockNumPages } = await import('pdfjs-dist')
            __setMockNumPages(1)

            const result = await extractTextFromPdf('https://example.com/single.pdf')

            expect(result.isReady).toBe(true)
            expect(result.pageTexts).toHaveLength(1)
            expect(result.pageTexts[0].pageNumber).toBe(1)
        })

        it('should handle network errors during PDF loading', async () => {
            const { __setMockLoadError } = await import('pdfjs-dist')
            __setMockLoadError(new Error('Network error: Failed to fetch PDF'))

            const result = await extractTextFromPdf('https://example.com/network-error.pdf')

            expect(result.isReady).toBe(false)
            expect(result.documentText).toBe('')
            expect(result.pageTexts).toHaveLength(0)
        })

        it('should handle corrupted PDF files', async () => {
            const { __setMockLoadError } = await import('pdfjs-dist')
            __setMockLoadError(new Error('Invalid PDF format: corrupted file'))

            const result = await extractTextFromPdf('https://example.com/corrupted.pdf')

            expect(result.isReady).toBe(false)
            expect(result.documentText).toBe('')
            expect(result.pageTexts).toHaveLength(0)
        })

        it('should handle permission errors', async () => {
            const { __setMockLoadError } = await import('pdfjs-dist')
            __setMockLoadError(new Error('Access denied: permission required'))

            const result = await extractTextFromPdf('https://example.com/protected.pdf')

            expect(result.isReady).toBe(false)
            expect(result.documentText).toBe('')
            expect(result.pageTexts).toHaveLength(0)
        })

        it('should handle slow loading PDFs with timeout', async () => {
            const { __setMockLoadDelay } = await import('pdfjs-dist')
            __setMockLoadDelay(100) // Fast for testing

            const startTime = performance.now()
            const result = await extractTextFromPdf('https://example.com/slow.pdf')
            const endTime = performance.now()

            expect(result.isReady).toBe(true)
            expect(endTime - startTime).toBeGreaterThan(90) // Should take at least the delay time
        })
    })

    describe('Issue Selection and Highlighting Integration', () => {
        let mockExtractor: PdfTextExtractor

        beforeEach(async () => {
            // Reset mocks
            const { __setMockNumPages, __setMockLoadError } = await import('pdfjs-dist')
            __setMockNumPages(3)
            __setMockLoadError(null)

            // Create a realistic extractor
            mockExtractor = await extractTextFromPdf('https://example.com/test.pdf')
        })

        it('should integrate issue selection with PDF highlighting end-to-end', () => {
            const issue = {
                _id: 'issue-1',
                originalText: 'page 1 content',
                offsetStart: 10,
                offsetEnd: 25,
                severity: 'critical',
                type: 'grammar'
            }

            // Test offset-based location
            const offsetResult = locateTextByOffset(mockExtractor, issue.offsetStart!, issue.offsetEnd!)
            expect(offsetResult.found).toBe(true)
            expect(offsetResult.pageNumber).toBe(1)

            // Test text-based search as fallback
            const searchResult = searchTextInPdf(mockExtractor, issue.originalText)
            expect(searchResult.found).toBe(true)
            expect(searchResult.pageNumber).toBe(1)
        })

        it('should handle multiple issue selections', () => {
            const issue1 = {
                _id: 'issue-1',
                originalText: 'page 1 content',
                offsetStart: 10,
                offsetEnd: 25,
                severity: 'critical',
                type: 'grammar'
            }

            const issue2 = {
                _id: 'issue-2',
                originalText: 'page 2 content',
                offsetStart: 150,
                offsetEnd: 165,
                severity: 'high',
                type: 'style'
            }

            const result1 = searchTextInPdf(mockExtractor, issue1.originalText)
            const result2 = searchTextInPdf(mockExtractor, issue2.originalText)

            expect(result1.found).toBe(true)
            expect(result1.pageNumber).toBe(1)
            expect(result2.found).toBe(true)
            expect(result2.pageNumber).toBe(2)
        })

        it('should handle issue selection with text search fallback', () => {
            const issue = {
                _id: 'issue-1',
                originalText: 'additional text',
                severity: 'medium',
                type: 'grammar'
            }

            const result = searchTextInPdf(mockExtractor, issue.originalText)
            expect(result.found).toBe(true)
            expect(result.pageNumber).toBeGreaterThanOrEqual(1)
        })

        it('should handle issue selection when text cannot be found', () => {
            const issue = {
                _id: 'issue-1',
                originalText: 'non-existent text',
                severity: 'low',
                type: 'grammar'
            }

            const result = searchTextInPdf(mockExtractor, issue.originalText)
            expect(result.found).toBe(false)
        })

        it('should handle text extraction failures gracefully', async () => {
            const { __setMockLoadError } = await import('pdfjs-dist')
            __setMockLoadError(new Error('Text extraction failed'))

            const failedExtractor = await extractTextFromPdf('https://example.com/failed.pdf')

            const issue = {
                _id: 'issue-1',
                originalText: 'some text',
                offsetStart: 10,
                offsetEnd: 25,
                severity: 'critical',
                type: 'grammar'
            }

            const offsetResult = locateTextByOffset(failedExtractor, issue.offsetStart!, issue.offsetEnd!)
            const searchResult = searchTextInPdf(failedExtractor, issue.originalText)

            expect(offsetResult.found).toBe(false)
            expect(searchResult.found).toBe(false)
        })
    })

    describe('Performance Tests for Large Documents', () => {
        it('should handle large PDFs without performance degradation', async () => {
            const { __setMockNumPages } = await import('pdfjs-dist')
            __setMockNumPages(500)

            const startTime = performance.now()
            const result = await extractTextFromPdf('https://example.com/large.pdf')
            const endTime = performance.now()

            expect(result.isReady).toBe(true)
            expect(result.pageTexts).toHaveLength(500)
            expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
        })

        it('should handle text extraction for large documents', async () => {
            const { __setMockNumPages } = await import('pdfjs-dist')
            __setMockNumPages(100)

            const startTime = performance.now()
            const result = await extractTextFromPdf('https://example.com/large.pdf')
            const endTime = performance.now()

            expect(result.isReady).toBe(true)
            expect(result.pageTexts).toHaveLength(100)
            expect(endTime - startTime).toBeLessThan(3000) // Should complete within 3 seconds
        })

        it('should handle memory efficiently with large documents', async () => {
            const { __setMockNumPages } = await import('pdfjs-dist')
            __setMockNumPages(1000)

            const result = await extractTextFromPdf('https://example.com/huge.pdf')

            expect(result.isReady).toBe(true)
            expect(result.pageTexts).toHaveLength(1000)
            expect(result.documentText.length).toBeGreaterThan(0)
        })
    })

    describe('Error Recovery and Retry Mechanisms', () => {
        it('should handle intermittent network issues', async () => {
            const { __setMockLoadError } = await import('pdfjs-dist')

            // First attempt fails
            __setMockLoadError(new Error('Network timeout'))
            const failedResult = await extractTextFromPdf('https://example.com/intermittent.pdf')
            expect(failedResult.isReady).toBe(false)

            // Second attempt succeeds
            __setMockLoadError(null)
            const successResult = await extractTextFromPdf('https://example.com/intermittent.pdf')
            expect(successResult.isReady).toBe(true)
        })

        it('should handle text extraction errors with graceful degradation', async () => {
            const { __setMockLoadError } = await import('pdfjs-dist')
            __setMockLoadError(new Error('Text extraction failed'))

            const result = await extractTextFromPdf('https://example.com/extraction-error.pdf')

            expect(result.isReady).toBe(false)
            expect(result.documentText).toBe('')
            expect(result.pageTexts).toHaveLength(0)
        })
    })

    describe('Complex User Workflows', () => {
        it('should handle complete document review workflow', async () => {
            const extractor = await extractTextFromPdf('https://example.com/review.pdf')

            const issues = [
                {
                    _id: 'issue-1',
                    originalText: 'page 1 content',
                    offsetStart: 10,
                    offsetEnd: 25,
                    severity: 'critical',
                    type: 'grammar'
                },
                {
                    _id: 'issue-2',
                    originalText: 'page 2 content',
                    offsetStart: 150,
                    offsetEnd: 175,
                    severity: 'high',
                    type: 'style'
                },
                {
                    _id: 'issue-3',
                    originalText: 'page 3 content',
                    offsetStart: 250,
                    offsetEnd: 275,
                    severity: 'medium',
                    type: 'clarity'
                }
            ]

            // Review each issue
            for (const issue of issues) {
                const offsetResult = locateTextByOffset(extractor, issue.offsetStart!, issue.offsetEnd!)
                const searchResult = searchTextInPdf(extractor, issue.originalText)

                expect(offsetResult.found || searchResult.found).toBe(true)
            }
        })

        it('should handle concurrent operations', async () => {
            const extractor = await extractTextFromPdf('https://example.com/concurrent.pdf')

            const issue = {
                _id: 'issue-1',
                originalText: 'page 1 content',
                offsetStart: 10,
                offsetEnd: 25,
                severity: 'critical',
                type: 'grammar'
            }

            // Perform multiple operations simultaneously
            const promises = [
                locateTextByOffset(extractor, issue.offsetStart!, issue.offsetEnd!),
                searchTextInPdf(extractor, issue.originalText),
                getPageForOffset(extractor, issue.offsetStart!),
                searchTextInPdf(extractor, 'additional text')
            ]

            const results = await Promise.all(promises)

            expect(results[0].found).toBe(true) // offset location
            expect(results[1].found).toBe(true) // text search
            expect(results[2]).toBe(1) // page calculation
            expect(results[3].found).toBe(true) // additional search
        })
    })

    describe('Edge Cases and Error Handling', () => {
        it('should handle empty PDF documents', async () => {
            const { __setMockNumPages } = await import('pdfjs-dist')
            __setMockNumPages(0)

            const result = await extractTextFromPdf('https://example.com/empty.pdf')

            expect(result.isReady).toBe(true)
            expect(result.pageTexts).toHaveLength(0)
            expect(result.documentText).toBe('')
        })

        it('should handle PDFs with special characters', async () => {
            // Mock PDF with special characters
            const { getDocument } = await import('pdfjs-dist')
            vi.mocked(getDocument).mockImplementationOnce(() => ({
                promise: Promise.resolve({
                    numPages: 1,
                    getPage: vi.fn().mockResolvedValue({
                        getTextContent: vi.fn().mockResolvedValue({
                            items: [
                                { str: 'Text with special chars: @#$%^&*()[]{}', hasEOL: false },
                                { str: ' and unicode: 你好世界 🌍', hasEOL: true }
                            ]
                        })
                    })
                })
            }))

            const result = await extractTextFromPdf('https://example.com/special.pdf')

            expect(result.isReady).toBe(true)
            expect(result.documentText).toContain('@#$%^&*()[]{}')
            expect(result.documentText).toContain('你好世界 🌍')

            const searchResult = searchTextInPdf(result, '你好世界')
            expect(searchResult.found).toBe(true)
        })

        it('should handle very long text content', async () => {
            // Mock PDF with very long text
            const longText = 'a'.repeat(10000)
            const { getDocument } = await import('pdfjs-dist')
            vi.mocked(getDocument).mockImplementationOnce(() => ({
                promise: Promise.resolve({
                    numPages: 1,
                    getPage: vi.fn().mockResolvedValue({
                        getTextContent: vi.fn().mockResolvedValue({
                            items: [{ str: longText, hasEOL: false }]
                        })
                    })
                })
            }))

            const result = await extractTextFromPdf('https://example.com/long.pdf')

            expect(result.isReady).toBe(true)
            expect(result.documentText.length).toBe(10000)

            const searchResult = searchTextInPdf(result, 'a'.repeat(100))
            expect(searchResult.found).toBe(true)
        })
    })
})