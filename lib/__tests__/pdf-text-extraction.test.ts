import { describe, it, expect, vi } from 'vitest'
import {
    extractTextFromPdf,
    locateTextByOffset,
    searchTextInPdf,
    getPageForOffset,
    type PdfTextExtractor,
    type TextSearchResult,
    type PageTextInfo
} from '../pdf-text-extraction'

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
    getDocument: vi.fn().mockImplementation((url: string) => ({
        promise: Promise.resolve({
            numPages: 3,
            getPage: vi.fn().mockImplementation((pageNum: number) =>
                Promise.resolve({
                    getTextContent: vi.fn().mockResolvedValue({
                        items: [
                            { str: `Page ${pageNum} text content`, hasEOL: false },
                            { str: ' with multiple items', hasEOL: true },
                            { str: ` and some more text on page ${pageNum}`, hasEOL: false }
                        ]
                    })
                })
            )
        })
    }))
}))

describe('PDF Text Extraction', () => {
    const mockExtractor: PdfTextExtractor = {
        documentText: 'This is a sample document with multiple pages.\nPage 2 has different content.\nPage 3 contains final text.',
        pageTexts: [
            {
                pageNumber: 1,
                text: 'This is a sample document with multiple pages.',
                textItems: [],
                startOffset: 0,
                endOffset: 46
            },
            {
                pageNumber: 2,
                text: 'Page 2 has different content.',
                textItems: [],
                startOffset: 47,
                endOffset: 76
            },
            {
                pageNumber: 3,
                text: 'Page 3 contains final text.',
                textItems: [],
                startOffset: 77,
                endOffset: 104
            }
        ],
        isReady: true
    }

    describe('PDF Text Extraction', () => {
        it('should extract text from PDF successfully', async () => {
            const result = await extractTextFromPdf('https://example.com/test.pdf')

            expect(result.isReady).toBe(true)
            expect(result.documentText).toContain('Page 1 text content')
            expect(result.pageTexts).toHaveLength(3)
            expect(result.pageTexts[0].pageNumber).toBe(1)
        })

        it('should handle PDF extraction errors', async () => {
            // Mock getDocument to throw an error
            const { getDocument } = await import('pdfjs-dist')
            vi.mocked(getDocument).mockImplementationOnce(() => ({
                promise: Promise.reject(new Error('PDF load failed'))
            }))

            const result = await extractTextFromPdf('https://example.com/invalid.pdf')

            expect(result.isReady).toBe(false)
            expect(result.documentText).toBe('')
            expect(result.pageTexts).toHaveLength(0)
        })

        it('should calculate correct offsets for pages', async () => {
            const result = await extractTextFromPdf('https://example.com/test.pdf')

            expect(result.pageTexts[0].startOffset).toBe(0)
            expect(result.pageTexts[1].startOffset).toBeGreaterThan(result.pageTexts[0].endOffset)
            expect(result.pageTexts[2].startOffset).toBeGreaterThan(result.pageTexts[1].endOffset)
        })
    })

    describe('Offset-based Text Location', () => {
        it('should locate text correctly using valid offsets', () => {
            const result = locateTextByOffset(mockExtractor, 10, 20)

            expect(result.found).toBe(true)
            expect(result.pageNumber).toBe(1)
            expect(result.startOffset).toBe(10)
            expect(result.endOffset).toBe(20)
        })

        it('should locate text on correct page based on offset', () => {
            // Offset 50 should be on page 2 (starts at offset 47)
            const result = locateTextByOffset(mockExtractor, 50, 60)

            expect(result.found).toBe(true)
            expect(result.pageNumber).toBe(2)
            expect(result.startOffset).toBe(3) // 50 - 47 = 3
            expect(result.endOffset).toBe(13) // 60 - 47 = 13
        })

        it('should handle offset at page boundary', () => {
            // Offset 47 is the start of page 2
            const result = locateTextByOffset(mockExtractor, 47, 50)

            expect(result.found).toBe(true)
            expect(result.pageNumber).toBe(2)
            expect(result.startOffset).toBe(0)
            expect(result.endOffset).toBe(3)
        })

        it('should handle offset beyond document length', () => {
            const result = locateTextByOffset(mockExtractor, 200, 210)

            expect(result.found).toBe(false)
            expect(result.pageNumber).toBe(1)
            expect(result.startOffset).toBe(0)
            expect(result.endOffset).toBe(0)
        })

        it('should handle negative offsets', () => {
            const result = locateTextByOffset(mockExtractor, -5, 5)

            expect(result.found).toBe(false)
        })

        it('should handle extractor that is not ready', () => {
            const notReadyExtractor: PdfTextExtractor = {
                ...mockExtractor,
                isReady: false
            }

            const result = locateTextByOffset(notReadyExtractor, 10, 20)

            expect(result.found).toBe(false)
            expect(result.pageNumber).toBe(1)
            expect(result.startOffset).toBe(0)
            expect(result.endOffset).toBe(0)
        })

        it('should clamp end offset to page text length', () => {
            // Request text that goes beyond page 1 length
            const result = locateTextByOffset(mockExtractor, 40, 100)

            expect(result.found).toBe(true)
            expect(result.pageNumber).toBe(1)
            expect(result.startOffset).toBe(40)
            expect(result.endOffset).toBe(46) // Clamped to page 1 text length
        })
    })

    describe('Text Search with Fuzzy Matching', () => {
        it('should find exact text match', () => {
            const result = searchTextInPdf(mockExtractor, 'sample document')

            expect(result.found).toBe(true)
            expect(result.pageNumber).toBe(1)
            expect(result.startOffset).toBeGreaterThanOrEqual(0)
            expect(result.endOffset).toBeGreaterThan(result.startOffset)
        })

        it('should find text on correct page', () => {
            const result = searchTextInPdf(mockExtractor, 'different content')

            expect(result.found).toBe(true)
            expect(result.pageNumber).toBe(2)
        })

        it('should handle case-insensitive search', () => {
            const result = searchTextInPdf(mockExtractor, 'SAMPLE DOCUMENT')

            expect(result.found).toBe(true)
            expect(result.pageNumber).toBe(1)
        })

        it('should handle text with extra spaces', () => {
            const result = searchTextInPdf(mockExtractor, 'sample   document')

            expect(result.found).toBe(true)
            expect(result.pageNumber).toBe(1)
        })

        it('should not find non-existent text', () => {
            const result = searchTextInPdf(mockExtractor, 'non-existent text')

            expect(result.found).toBe(false)
            expect(result.pageNumber).toBe(1)
            expect(result.startOffset).toBe(0)
            expect(result.endOffset).toBe(0)
        })

        it('should handle empty search text', () => {
            const result = searchTextInPdf(mockExtractor, '')

            expect(result.found).toBe(false)
        })

        it('should handle whitespace-only search text', () => {
            const result = searchTextInPdf(mockExtractor, '   ')

            expect(result.found).toBe(false)
        })

        it('should handle extractor that is not ready', () => {
            const notReadyExtractor: PdfTextExtractor = {
                ...mockExtractor,
                isReady: false
            }

            const result = searchTextInPdf(notReadyExtractor, 'sample document')

            expect(result.found).toBe(false)
        })

        it('should use fuzzy matching for similar text', () => {
            // Test with slightly different text that should match with fuzzy logic
            const result = searchTextInPdf(mockExtractor, 'sample documnt', 0.8) // Missing 'e'

            // This might find a match depending on the fuzzy matching implementation
            expect(result).toBeDefined()
            expect(typeof result.found).toBe('boolean')
        })

        it('should respect similarity threshold', () => {
            // Test with high threshold that should not match
            const result = searchTextInPdf(mockExtractor, 'completely different text', 0.9)

            expect(result.found).toBe(false)
        })

        it('should find partial matches within longer text', () => {
            const result = searchTextInPdf(mockExtractor, 'multiple pages')

            expect(result.found).toBe(true)
            expect(result.pageNumber).toBe(1)
        })
    })

    describe('Page Calculation for Offset', () => {
        it('should return correct page for offset in first page', () => {
            const page = getPageForOffset(mockExtractor, 25)
            expect(page).toBe(1)
        })

        it('should return correct page for offset in second page', () => {
            const page = getPageForOffset(mockExtractor, 60)
            expect(page).toBe(2)
        })

        it('should return correct page for offset in third page', () => {
            const page = getPageForOffset(mockExtractor, 90)
            expect(page).toBe(3)
        })

        it('should return page 1 for offset at document start', () => {
            const page = getPageForOffset(mockExtractor, 0)
            expect(page).toBe(1)
        })

        it('should return page 1 for offset beyond document', () => {
            const page = getPageForOffset(mockExtractor, 200)
            expect(page).toBe(1)
        })

        it('should return page 1 for negative offset', () => {
            const page = getPageForOffset(mockExtractor, -10)
            expect(page).toBe(1)
        })

        it('should return page 1 when extractor is not ready', () => {
            const notReadyExtractor: PdfTextExtractor = {
                ...mockExtractor,
                isReady: false
            }

            const page = getPageForOffset(notReadyExtractor, 25)
            expect(page).toBe(1)
        })

        it('should handle page boundary offsets correctly', () => {
            // Test offset exactly at page boundary
            const page1End = getPageForOffset(mockExtractor, 46) // End of page 1
            const page2Start = getPageForOffset(mockExtractor, 47) // Start of page 2

            expect(page1End).toBe(1)
            expect(page2Start).toBe(2)
        })
    })

    describe('Edge Cases and Error Handling', () => {
        it('should handle extractor with empty page texts', () => {
            const emptyExtractor: PdfTextExtractor = {
                documentText: '',
                pageTexts: [],
                isReady: true
            }

            const offsetResult = locateTextByOffset(emptyExtractor, 10, 20)
            const searchResult = searchTextInPdf(emptyExtractor, 'test')
            const page = getPageForOffset(emptyExtractor, 10)

            expect(offsetResult.found).toBe(false)
            expect(searchResult.found).toBe(false)
            expect(page).toBe(1)
        })

        it('should handle extractor with malformed page data', () => {
            const malformedExtractor: PdfTextExtractor = {
                documentText: 'Some text',
                pageTexts: [
                    {
                        pageNumber: 1,
                        text: 'Some text',
                        textItems: [],
                        startOffset: 0,
                        endOffset: -1 // Invalid end offset
                    }
                ],
                isReady: true
            }

            const result = locateTextByOffset(malformedExtractor, 5, 10)
            expect(result).toBeDefined()
        })

        it('should handle very large offsets', () => {
            const result = locateTextByOffset(mockExtractor, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
            expect(result.found).toBe(false)
        })

        it('should handle very long search text', () => {
            const longText = 'a'.repeat(10000)
            const result = searchTextInPdf(mockExtractor, longText)
            expect(result.found).toBe(false)
        })

        it('should handle special characters in search text', () => {
            const specialCharsExtractor: PdfTextExtractor = {
                documentText: 'Text with special chars: @#$%^&*()[]{}',
                pageTexts: [
                    {
                        pageNumber: 1,
                        text: 'Text with special chars: @#$%^&*()[]{}',
                        textItems: [],
                        startOffset: 0,
                        endOffset: 38
                    }
                ],
                isReady: true
            }

            const result = searchTextInPdf(specialCharsExtractor, 'special chars: @#$%')$')
            expect(result.found).toBe(true)
        })

        it('should handle unicode characters', () => {
            const unicodeExtractor: PdfTextExtractor = {
                documentText: 'Text with unicode: 你好世界 🌍',
                pageTexts: [
                    {
                        pageNumber: 1,
                        text: 'Text with unicode: 你好世界 🌍',
                        textItems: [],
                        startOffset: 0,
                        endOffset: 25
                    }
                ],
                isReady: true
            }

            const result = searchTextInPdf(unicodeExtractor, '你好世界')
            expect(result.found).toBe(true)
        })
    })

    describe('Performance and Optimization', () => {
        it('should handle large documents efficiently', () => {
            const largeExtractor: PdfTextExtractor = {
                documentText: 'Large document text '.repeat(1000),
                pageTexts: Array.from({ length: 100 }, (_, i) => ({
                    pageNumber: i + 1,
                    text: `Page ${i + 1} text `.repeat(100),
                    textItems: [],
                    startOffset: i * 1500,
                    endOffset: (i + 1) * 1500 - 1
                })),
                isReady: true
            }

            const startTime = performance.now()
            const result = searchTextInPdf(largeExtractor, 'Page 50')
            const endTime = performance.now()

            expect(result.found).toBe(true)
            expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
        })

        it('should handle multiple consecutive searches efficiently', () => {
            const searches = [
                'sample document',
                'different content',
                'final text',
                'multiple pages',
                'non-existent'
            ]

            const startTime = performance.now()
            const results = searches.map(search => searchTextInPdf(mockExtractor, search))
            const endTime = performance.now()

            expect(results).toHaveLength(5)
            expect(results.filter(r => r.found)).toHaveLength(4) // 4 should be found
            expect(endTime - startTime).toBeLessThan(100) // Should be fast for small document
        })
    })
})