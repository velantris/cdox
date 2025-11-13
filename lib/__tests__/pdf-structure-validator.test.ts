import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'

import { validatePdfStructure } from '../pdf-structure-validator'

async function createSamplePdfBytes(): Promise<ArrayBuffer> {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.addPage()
    const pdfBytes = await pdfDoc.save()
    return pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength)
}

function issueCodes(issues: { code: string }[]): string[] {
    return issues.map(issue => issue.code)
}

describe('validatePdfStructure buffer handling', () => {
    it('returns parse errors when provided a detached ArrayBuffer', async () => {
        const buffer = await createSamplePdfBytes()

        structuredClone(buffer, { transfer: [buffer] })
        expect(buffer.byteLength).toBe(0)

        const result = await validatePdfStructure(buffer)
        expect(issueCodes(result.pdf_a_compliance.issues)).toContain('PDF_A_ENCRYPTED_OR_INVALID')
        expect(issueCodes(result.pdf_ua_compliance.issues)).toContain('PDF_UA_NOT_PARSABLE')
    })

    it('successfully validates when extraction uses a cloned buffer', async () => {
        const originalBuffer = await createSamplePdfBytes()
        const extractionBytes = new Uint8Array(originalBuffer).slice()

        structuredClone(extractionBytes.buffer, { transfer: [extractionBytes.buffer] })

        expect(originalBuffer.byteLength).toBeGreaterThan(0)

        const result = await validatePdfStructure(originalBuffer)
        expect(issueCodes(result.pdf_a_compliance.issues)).not.toContain('PDF_A_ENCRYPTED_OR_INVALID')
        expect(issueCodes(result.pdf_ua_compliance.issues)).not.toContain('PDF_UA_NOT_PARSABLE')
    })
})

