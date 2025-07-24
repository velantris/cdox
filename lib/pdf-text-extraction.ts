// Dynamic imports for PDF.js to avoid SSR issues
let getDocument: any = null
let GlobalWorkerOptions: any = null

// Initialize PDF.js with CDN worker configuration
const initializePdfJs = async () => {
    if (typeof window !== 'undefined' && !getDocument) {
        // Import PDF.js
        const pdfjs = await import('pdfjs-dist')
        getDocument = pdfjs.getDocument
        GlobalWorkerOptions = pdfjs.GlobalWorkerOptions

        // Configure worker with CDN for better compatibility
        GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
    }
}

// Initialize on import
initializePdfJs().catch(console.error)

export interface TextItem {
    str: string
    dir: string
    width: number
    height: number
    transform: number[]
    fontName: string
    hasEOL: boolean
}

export interface TextContent {
    items: TextItem[]
    styles: Record<string, any>
}

export interface PageTextInfo {
    pageNumber: number
    text: string
    textItems: TextItem[]
    startOffset: number
    endOffset: number
}

export interface TextSearchResult {
    found: boolean
    pageNumber: number
    startOffset: number
    endOffset: number
    boundingRect?: {
        x: number
        y: number
        width: number
        height: number
    }
}

export interface PdfTextExtractor {
    documentText: string
    pageTexts: PageTextInfo[]
    isReady: boolean
    extractionError?: string
}

/**
 * Extracts text content from all pages of a PDF document
 */
export async function extractTextFromPdf(documentUrl: string): Promise<PdfTextExtractor> {
    try {
        // Initialize PDF.js if not already done
        await initializePdfJs()

        if (!getDocument) {
            throw new Error('PDF.js not available - this function must be called on the client side')
        }

        const loadingTask = getDocument(documentUrl)
        const pdfDocument = await loadingTask.promise

        const pageTexts: PageTextInfo[] = []
        let documentText = ''
        let currentOffset = 0

        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum)
            const textContent = await page.getTextContent()

            // Combine all text items into a single string for this page
            const pageText = textContent.items
                .filter((item: any): item is TextItem => 'str' in item)
                .map((item: TextItem) => item.str)
                .join(' ')

            const startOffset = currentOffset
            const endOffset = currentOffset + pageText.length

            pageTexts.push({
                pageNumber: pageNum,
                text: pageText,
                textItems: textContent.items.filter((item: any): item is TextItem => 'str' in item),
                startOffset,
                endOffset
            })

            documentText += pageText + '\n'
            currentOffset = endOffset + 1 // +1 for the newline
        }

        return {
            documentText,
            pageTexts,
            isReady: true
        }
    } catch (error) {
        console.error('Error extracting text from PDF:', error)
        return {
            documentText: '',
            pageTexts: [],
            isReady: false
        }
    }
}

/**
 * Locates text in PDF using offset positions
 */
export function locateTextByOffset(
    extractor: PdfTextExtractor,
    offsetStart: number,
    offsetEnd: number
): TextSearchResult {
    if (!extractor.isReady) {
        return { found: false, pageNumber: 1, startOffset: 0, endOffset: 0 }
    }

    // Find which page contains the text based on offset
    for (const pageInfo of extractor.pageTexts) {
        if (offsetStart >= pageInfo.startOffset && offsetStart <= pageInfo.endOffset) {
            return {
                found: true,
                pageNumber: pageInfo.pageNumber,
                startOffset: offsetStart - pageInfo.startOffset,
                endOffset: Math.min(offsetEnd - pageInfo.startOffset, pageInfo.text.length)
            }
        }
    }

    return { found: false, pageNumber: 1, startOffset: 0, endOffset: 0 }
}

/**
 * Searches for text using fuzzy matching as fallback
 */
export function searchTextInPdf(
    extractor: PdfTextExtractor,
    searchText: string,
    threshold: number = 0.8
): TextSearchResult {
    if (!extractor.isReady || !searchText.trim()) {
        return { found: false, pageNumber: 1, startOffset: 0, endOffset: 0 }
    }

    const normalizedSearchText = normalizeText(searchText)

    // Search through each page
    for (const pageInfo of extractor.pageTexts) {
        const normalizedPageText = normalizeText(pageInfo.text)

        // Try exact match first
        let index = normalizedPageText.indexOf(normalizedSearchText)
        if (index !== -1) {
            return {
                found: true,
                pageNumber: pageInfo.pageNumber,
                startOffset: index,
                endOffset: index + normalizedSearchText.length
            }
        }

        // Try fuzzy matching for partial matches
        const fuzzyResult = findBestMatch(normalizedPageText, normalizedSearchText, threshold)
        if (fuzzyResult.found) {
            return {
                found: true,
                pageNumber: pageInfo.pageNumber,
                startOffset: fuzzyResult.startOffset,
                endOffset: fuzzyResult.endOffset
            }
        }
    }

    return { found: false, pageNumber: 1, startOffset: 0, endOffset: 0 }
}

/**
 * Normalizes text for better matching (removes extra spaces, converts to lowercase)
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Finds the best fuzzy match for text within a page
 */
function findBestMatch(
    pageText: string,
    searchText: string,
    threshold: number
): { found: boolean; startOffset: number; endOffset: number } {
    const searchWords = searchText.split(' ').filter(word => word.length > 0)
    const pageWords = pageText.split(' ')

    let bestMatch = { found: false, startOffset: 0, endOffset: 0, score: 0 }

    // Sliding window approach to find best match
    for (let i = 0; i <= pageWords.length - searchWords.length; i++) {
        const windowText = pageWords.slice(i, i + searchWords.length).join(' ')
        const similarity = calculateSimilarity(windowText, searchText)

        if (similarity >= threshold && similarity > bestMatch.score) {
            const startOffset = pageText.indexOf(windowText)
            if (startOffset !== -1) {
                bestMatch = {
                    found: true,
                    startOffset,
                    endOffset: startOffset + windowText.length,
                    score: similarity
                }
            }
        }
    }

    return bestMatch
}

/**
 * Calculates similarity between two strings using a simple algorithm
 */
function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,     // deletion
                matrix[j - 1][i] + 1,     // insertion
                matrix[j - 1][i - 1] + indicator // substitution
            )
        }
    }

    return matrix[str2.length][str1.length]
}

/**
 * Calculates which page contains a given offset position
 */
export function getPageForOffset(extractor: PdfTextExtractor, offset: number): number {
    if (!extractor.isReady) return 1

    for (const pageInfo of extractor.pageTexts) {
        if (offset >= pageInfo.startOffset && offset <= pageInfo.endOffset) {
            return pageInfo.pageNumber
        }
    }

    return 1 // Default to first page if not found
}