import { PDFDocument } from "pdf-lib";
import {
    PDFArray,
    PDFBool,
    PDFContext,
    PDFDict,
    PDFHexString,
    PDFName,
    PDFNumber,
    PDFRef,
    PDFStream,
    PDFString
} from "pdf-lib/cjs/core";

type IssueSeverity = "low" | "medium" | "high" | "critical";

export interface PdfStructureIssue {
    code: string;
    message: string;
    severity: IssueSeverity;
    context?: string;
}

export interface PdfUaComplianceResult {
    compliant: boolean;
    issues: PdfStructureIssue[];
}

export interface PdfAComplianceResult {
    compliant: boolean;
    version?: "PDF/A-1" | "PDF/A-2" | "PDF/A-3";
    issues: PdfStructureIssue[];
}

export interface PdfStructureComplianceResult {
    pdf_ua_compliance: PdfUaComplianceResult;
    pdf_a_compliance: PdfAComplianceResult;
    structure_issues: PdfStructureIssue[];
}

interface TraversalState {
    lastHeadingLevel: number | null;
    headingStack: number[];
    altTextMissing: PdfStructureIssue[];
    headingIssues: PdfStructureIssue[];
    readingOrderIssues: PdfStructureIssue[];
    formIssues: PdfStructureIssue[];
}

export async function validatePdfStructure(bytes: ArrayBuffer): Promise<PdfStructureComplianceResult> {
    const pdfUaIssues: PdfStructureIssue[] = [];
    const pdfAIssues: PdfStructureIssue[] = [];
    const structureIssues: PdfStructureIssue[] = [];

    let pdfDoc: PDFDocument | null = null;

    try {
        pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    } catch (error) {
        pdfAIssues.push({
            code: "PDF_A_ENCRYPTED_OR_INVALID",
            message: "Failed to load PDF. The document might be encrypted or malformed.",
            severity: "critical"
        });

        pdfUaIssues.push({
            code: "PDF_UA_NOT_PARSABLE",
            message: "Unable to parse document structure; tagged content cannot be assessed.",
            severity: "critical"
        });

        return {
            pdf_ua_compliance: {
                compliant: false,
                issues: pdfUaIssues
            },
            pdf_a_compliance: {
                compliant: false,
                issues: pdfAIssues
            },
            structure_issues: [...pdfUaIssues, ...pdfAIssues]
        };
    }

    const context = pdfDoc.context;
    let detectedPdfAPart: "PDF/A-1" | "PDF/A-2" | "PDF/A-3" | null = null;

    try {
        const catalog = pdfDoc.catalog;

        // ------------------------------
        // PDF/UA: Tagged structure checks
        // ------------------------------
        const markInfo = catalog.lookupMaybe(PDFName.of("MarkInfo"), PDFDict);
        if (!markInfo) {
            const issue = {
                code: "PDF_UA_MARK_INFO_MISSING",
                message: "MarkInfo dictionary missing. Document is likely not marked as tagged.",
                severity: "critical" as IssueSeverity
            };
            pdfUaIssues.push(issue);
            structureIssues.push(issue);
        } else {
            const marked = markInfo.lookupMaybe(PDFName.of("Marked"), PDFBool);
            if (!marked || !marked.asBoolean()) {
                const issue = {
                    code: "PDF_UA_NOT_TAGGED",
                    message: "MarkInfo.Marked flag is not present or false. Document content is not tagged for accessibility.",
                    severity: "critical" as IssueSeverity
                };
                pdfUaIssues.push(issue);
                structureIssues.push(issue);
            }
        }

        const structTreeRoot = catalog.lookupMaybe(PDFName.of("StructTreeRoot"), PDFDict);
        if (!structTreeRoot) {
            const issue = {
                code: "PDF_UA_STRUCT_TREE_MISSING",
                message: "StructTreeRoot missing. Tagged PDF structure is required for PDF/UA compliance.",
                severity: "critical" as IssueSeverity
            };
            pdfUaIssues.push(issue);
            structureIssues.push(issue);
        } else {
            const traversalState: TraversalState = {
                lastHeadingLevel: null,
                headingStack: [],
                altTextMissing: [],
                headingIssues: [],
                readingOrderIssues: [],
                formIssues: []
            };

            const visited = new Set<number>();
            traverseStructureTree(structTreeRoot, context, traversalState, visited, "Root");

            [...traversalState.altTextMissing, ...traversalState.headingIssues, ...traversalState.readingOrderIssues].forEach(issue => {
                pdfUaIssues.push(issue);
                structureIssues.push(issue);
            });
        }

        // Form field labels
        const acroForm = catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
        if (acroForm) {
            const fields = acroForm.lookupMaybe(PDFName.of("Fields"), PDFArray);
            if (fields) {
                const formIssues = validateFormFields(fields, context);
                formIssues.forEach(issue => {
                    pdfUaIssues.push(issue);
                    structureIssues.push(issue);
                });
            }
        }

        // ------------------------------
        // PDF/A checks
        // ------------------------------
        const trailerInfo = (context as unknown as { trailerInfo?: { Encrypt?: PDFRef } }).trailerInfo;
        const encryptRef = trailerInfo?.Encrypt;
        let encryptDict: PDFDict | undefined;
        if (encryptRef) {
            try {
                encryptDict = context.lookupMaybe(encryptRef, PDFDict);
            } catch {
                encryptDict = undefined;
            }
        }
        if (encryptDict) {
            const issue = {
                code: "PDF_A_ENCRYPTED",
                message: "Encryption dictionary detected. PDF/A documents must not be encrypted.",
                severity: "critical" as IssueSeverity
            };
            pdfAIssues.push(issue);
            structureIssues.push(issue);
        }

        const metadataStream = catalog.lookupMaybe(PDFName.of("Metadata"), PDFStream);
        if (metadataStream) {
            try {
                const metadataBytes = metadataStream.getContents();
                const metadataString = bytesToString(metadataBytes);
                detectedPdfAPart = detectPdfAVersion(metadataString);
                if (!detectedPdfAPart) {
                    const issue = {
                        code: "PDF_A_METADATA_MISSING_PART",
                        message: "XMP metadata does not declare a PDF/A conformance part.",
                        severity: "high" as IssueSeverity
                    };
                    pdfAIssues.push(issue);
                    structureIssues.push(issue);
                }
            } catch (error) {
                const issue = {
                    code: "PDF_A_METADATA_UNREADABLE",
                    message: "Failed to decode XMP metadata stream.",
                    severity: "medium" as IssueSeverity
                };
                pdfAIssues.push(issue);
                structureIssues.push(issue);
            }
        } else {
            const issue = {
                code: "PDF_A_METADATA_MISSING",
                message: "Metadata stream missing. PDF/A requires embedded XMP metadata.",
                severity: "critical" as IssueSeverity
            };
            pdfAIssues.push(issue);
            structureIssues.push(issue);
        }

        const fontIssues = validateEmbeddedFonts(pdfDoc);
        fontIssues.forEach(issue => {
            pdfAIssues.push(issue);
            structureIssues.push(issue);
        });

        const colorSpaceIssues = validateColorSpaces(pdfDoc);
        colorSpaceIssues.forEach(issue => {
            pdfAIssues.push(issue);
            structureIssues.push(issue);
        });

        const externalRefIssues = detectExternalReferences(pdfDoc);
        externalRefIssues.forEach(issue => {
            pdfAIssues.push(issue);
            structureIssues.push(issue);
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const uaFailure: PdfStructureIssue = {
            code: "PDF_UA_VALIDATION_ERROR",
            message: `PDF/UA structural validation failed: ${message}`,
            severity: "critical"
        };
        const pdfAFailure: PdfStructureIssue = {
            code: "PDF_A_VALIDATION_ERROR",
            message: `PDF/A validation failed due to structural analysis error: ${message}`,
            severity: "critical"
        };
        pdfUaIssues.push(uaFailure);
        pdfAIssues.push(pdfAFailure);
        structureIssues.push(uaFailure, pdfAFailure);
    }

    return {
        pdf_ua_compliance: {
            compliant: pdfUaIssues.length === 0,
            issues: pdfUaIssues
        },
        pdf_a_compliance: {
            compliant: pdfAIssues.length === 0,
            version: detectedPdfAPart ?? undefined,
            issues: pdfAIssues
        },
        structure_issues: structureIssues
    };
}

function traverseStructureTree(
    structElem: PDFDict,
    context: PDFContext,
    state: TraversalState,
    visited: Set<number>,
    path: string
) {
    const ref = context.getObjectRef(structElem);
    if (ref) {
        const key = ref.objectNumber;
        if (visited.has(key)) {
            return;
        }
        visited.add(key);
    }

    const tagName = getTagName(structElem);
    if (!tagName) {
        state.readingOrderIssues.push({
            code: "PDF_UA_TAG_NAME_MISSING",
            message: `Structure element at ${path} is missing tag name.`,
            severity: "medium"
        });
    }

    if (tagName && /^H\d$/i.test(tagName)) {
        const level = parseInt(tagName.slice(1), 10);
        if (Number.isFinite(level)) {
            const lastLevel = state.lastHeadingLevel;
            if (lastLevel !== null && level > lastLevel + 1) {
                state.headingIssues.push({
                    code: "PDF_UA_HEADING_HIERARCHY",
                    message: `Heading level ${level} found after ${lastLevel}. Heading levels should increase by no more than one.`,
                    severity: "medium",
                    context: path
                });
            }
            state.lastHeadingLevel = level;
            state.headingStack.push(level);
        }
    }

    if (tagName && tagName.toLowerCase() === "figure") {
        const alt = structElem.lookupMaybe(PDFName.of("Alt"), PDFString) ?? structElem.lookupMaybe(PDFName.of("Alt"), PDFHexString);
        const actualText = structElem.lookupMaybe(PDFName.of("ActualText"), PDFString) ?? structElem.lookupMaybe(PDFName.of("ActualText"), PDFHexString);
        if (!alt && !actualText) {
            state.altTextMissing.push({
                code: "PDF_UA_ALT_TEXT_MISSING",
                message: "Figure element is missing alternative text.",
                severity: "high",
                context: path
            });
        }
    }

    const kids = structElem.lookup(PDFName.of("K"));
    if (!kids) {
        return;
    }

    const resolvedKids: Array<PDFDict | PDFArray> = [];
    if (kids instanceof PDFArray) {
        for (let idx = 0; idx < kids.size(); idx += 1) {
            const kid = dereference(kids.get(idx), context);
            if (!kid) {
                continue;
            }
            if (kid instanceof PDFDict || kid instanceof PDFArray) {
                resolvedKids.push(kid);
            } else if (kid instanceof PDFNumber) {
                // Numbers represent marked-content IDs; ensure struct element has page reference
                const page = structElem.lookup(PDFName.of("Pg"));
                if (!page) {
                    state.readingOrderIssues.push({
                        code: "PDF_UA_MCID_WITHOUT_PAGE",
                        message: `MCID reference without associated page in element ${path}.`,
                        severity: "medium"
                    });
                }
            }
        }
    } else {
        const kid = dereference(kids, context);
        if (kid instanceof PDFDict || kid instanceof PDFArray) {
            resolvedKids.push(kid);
        }
    }

    resolvedKids.forEach((child, index) => {
        if (child instanceof PDFDict) {
            traverseStructureTree(child, context, state, visited, `${path}/${tagName || "Unknown"}[${index}]`);
        } else if (child instanceof PDFArray) {
            // Inline array of MCIDs
            for (let idx = 0; idx < child.size(); idx += 1) {
                const nested = dereference(child.get(idx), context);
                if (nested instanceof PDFDict) {
                    traverseStructureTree(nested, context, state, visited, `${path}/${tagName || "Unknown"}[${index}]/Array${idx}`);
                }
            }
        }
    });
}

function validateFormFields(fields: PDFArray, context: PDFContext): PdfStructureIssue[] {
    const issues: PdfStructureIssue[] = [];

    for (let index = 0; index < fields.size(); index += 1) {
        const fieldRef = fields.get(index);
        const fieldDict = dereference(fieldRef, context);
        if (!(fieldDict instanceof PDFDict)) {
            continue;
        }

        const type = getName(fieldDict.lookup(PDFName.of("FT")));
        const fieldName = getStringValue(fieldDict.lookup(PDFName.of("TU")) ?? fieldDict.lookup(PDFName.of("T")));

        if (type && ["Btn", "Tx", "Ch", "Sig"].includes(type)) {
            if (!fieldName || !fieldName.trim()) {
                issues.push({
                    code: "PDF_UA_FORM_FIELD_LABEL_MISSING",
                    message: "Interactive form field is missing an accessible name.",
                    severity: "high"
                });
            }
        }

        const kids = fieldDict.lookupMaybe(PDFName.of("Kids"), PDFArray);
        if (kids) {
            issues.push(...validateFormFields(kids, context));
        }
    }

    return issues;
}

function validateEmbeddedFonts(pdfDoc: PDFDocument): PdfStructureIssue[] {
    const issues: PdfStructureIssue[] = [];
    const pages = pdfDoc.getPages();
    const seenFonts = new Set<string>();

    pages.forEach((page, pageIndex) => {
        const resources = page.node.lookupMaybe(PDFName.of("Resources"), PDFDict);
        if (!resources) {
            return;
        }

        const fonts = resources.lookupMaybe(PDFName.of("Font"), PDFDict);
        if (!fonts) {
            return;
        }

        fonts.keys().forEach(fontName => {
            const fontRef = fonts.get(fontName);
            const fontDict = dereference(fontRef, pdfDoc.context);
            if (!(fontDict instanceof PDFDict)) {
                return;
            }

            const descriptor = fontDict.lookupMaybe(PDFName.of("FontDescriptor"), PDFDict);
            const fontKey = fontName.decodeText();
            if (!descriptor) {
                issues.push({
                    code: "PDF_A_FONT_DESCRIPTOR_MISSING",
                    message: `Font ${fontKey} on page ${pageIndex + 1} is missing a FontDescriptor.`,
                    severity: "high"
                });
                return;
            }

            if (seenFonts.has(fontKey)) {
                return;
            }

            const hasEmbeddedFile =
                descriptor.lookup(PDFName.of("FontFile")) ||
                descriptor.lookup(PDFName.of("FontFile2")) ||
                descriptor.lookup(PDFName.of("FontFile3"));

            if (!hasEmbeddedFile) {
                issues.push({
                    code: "PDF_A_FONT_NOT_EMBEDDED",
                    message: `Font ${fontKey} is not embedded. PDF/A requires all fonts to be embedded.`,
                    severity: "critical"
                });
            }

            seenFonts.add(fontKey);
        });
    });

    return issues;
}

function validateColorSpaces(pdfDoc: PDFDocument): PdfStructureIssue[] {
    const issues: PdfStructureIssue[] = [];
    const allowedColorSpaces = new Set(["DeviceGray", "DeviceRGB", "DeviceCMYK", "ICCBased", "CalGray", "CalRGB", "Lab"]);

    pdfDoc.getPages().forEach((page, pageIndex) => {
        const resources = page.node.lookupMaybe(PDFName.of("Resources"), PDFDict);
        if (!resources) {
            return;
        }

        const colorSpaces = resources.lookup(PDFName.of("ColorSpace"));
        if (!colorSpaces) {
            return;
        }

        if (colorSpaces instanceof PDFDict) {
            colorSpaces.keys().forEach(key => {
                const colorSpaceName = key.decodeText();
                const value = colorSpaces.get(key);
                const resolved = dereference(value, pdfDoc.context);
                if (resolved instanceof PDFName) {
                    const name = resolved.decodeText();
                    if (!allowedColorSpaces.has(name)) {
                        issues.push({
                            code: "PDF_A_UNSUPPORTED_COLOR_SPACE",
                            message: `Unsupported color space ${name} referenced on page ${pageIndex + 1}.`,
                            severity: "high"
                        });
                    }
                } else if (resolved instanceof PDFArray) {
                    const base = resolved.get(0);
                    const baseName = base instanceof PDFName ? base.decodeText() : undefined;
                    if (baseName && !allowedColorSpaces.has(baseName)) {
                        issues.push({
                            code: "PDF_A_COMPLEX_COLOR_SPACE",
                            message: `Color space ${colorSpaceName} uses unsupported base color space ${baseName} on page ${pageIndex + 1}.`,
                            severity: "medium"
                        });
                    }
                }
            });
        }
    });

    return issues;
}

function detectExternalReferences(pdfDoc: PDFDocument): PdfStructureIssue[] {
    const issues: PdfStructureIssue[] = [];
    const pages = pdfDoc.getPages();

    pages.forEach((page, pageIndex) => {
        const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
        if (!annotations) {
            return;
        }

        for (let idx = 0; idx < annotations.size(); idx += 1) {
            const annotationRef = annotations.get(idx);
            const annotationDict = dereference(annotationRef, pdfDoc.context);
            if (!(annotationDict instanceof PDFDict)) {
                continue;
            }

            const action = annotationDict.lookupMaybe(PDFName.of("A"), PDFDict);
            if (action) {
                const actionType = getName(action.lookup(PDFName.of("S")));
                if (actionType === "URI") {
                    issues.push({
                        code: "PDF_A_EXTERNAL_URI",
                        message: `External URI action detected in annotation on page ${pageIndex + 1}.`,
                        severity: "medium"
                    });
                }

                if (actionType === "Launch") {
                    issues.push({
                        code: "PDF_A_EXTERNAL_LAUNCH",
                        message: `Launch action detected in annotation on page ${pageIndex + 1}. PDF/A forbids external launch actions.`,
                        severity: "high"
                    });
                }
            }

            const fileSpec = annotationDict.lookupMaybe(PDFName.of("FS"), PDFDict);
            if (fileSpec) {
                const fsType = getName(fileSpec.lookup(PDFName.of("FS")));
                if (fsType === "URL") {
                    issues.push({
                        code: "PDF_A_EXTERNAL_FILESPEC",
                        message: `External file specification detected in annotation on page ${pageIndex + 1}.`,
                        severity: "medium"
                    });
                }
            }
        }
    });

    return issues;
}

function dereference(object: any, context: PDFContext): any {
    if (!object) {
        return undefined;
    }
    if (object instanceof PDFRef) {
        return context.lookup(object);
    }
    return object;
}

function getTagName(dict: PDFDict): string | undefined {
    const name = dict.lookupMaybe(PDFName.of("S"), PDFName);
    return name ? name.decodeText() : undefined;
}

function getName(value: any): string | undefined {
    if (!value) {
        return undefined;
    }
    if (value instanceof PDFName) {
        return value.decodeText();
    }
    return undefined;
}

function bytesToString(data: Uint8Array): string {
    if (typeof TextDecoder !== "undefined") {
        return new TextDecoder("utf-8", { fatal: false }).decode(data);
    }
    return Buffer.from(data).toString("utf8");
}

function detectPdfAVersion(metadata: string): "PDF/A-1" | "PDF/A-2" | "PDF/A-3" | null {
    const partMatch = metadata.match(/pdfaid:part>(\d)/i);
    if (!partMatch) {
        return null;
    }

    switch (partMatch[1]) {
        case "1":
            return "PDF/A-1";
        case "2":
            return "PDF/A-2";
        case "3":
            return "PDF/A-3";
        default:
            return null;
    }
}

function getStringValue(value: any): string | undefined {
    if (!value) {
        return undefined;
    }
    if (value instanceof PDFString) {
        return value.decodeText();
    }
    if (value instanceof PDFHexString) {
        return value.decodeText();
    }
    return undefined;
}
