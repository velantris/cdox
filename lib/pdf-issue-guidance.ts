import type { PdfStructureIssue } from "./pdf-structure-validator";

interface PdfIssueGuidance {
    section: string;
    remediation: string;
    reference?: string;
}

const PDF_ISSUE_GUIDANCE: Record<string, PdfIssueGuidance> = {
    PDF_UA_MARK_INFO_MISSING: {
        section: "PDF/UA Accessibility",
        remediation: "Add a MarkInfo dictionary with /Marked true and retag the document so every meaningful element is included in the structure tree before re-exporting.",
        reference: "ISO 14289-1 (PDF/UA-1) requirement for Tagged PDF documents."
    },
    PDF_UA_NOT_TAGGED: {
        section: "PDF/UA Accessibility",
        remediation: "Export or remediate the file as a tagged PDF. In Acrobat, choose 'Autotag Document', then review tags to ensure all content is represented.",
        reference: "ISO 14289-1 (PDF/UA-1) tagged PDF mandate."
    },
    PDF_UA_STRUCT_TREE_MISSING: {
        section: "PDF/UA Accessibility",
        remediation: "Generate a StructTreeRoot and tag headings, paragraphs, lists, and tables so assistive tech can navigate the document.",
        reference: "ISO 14289-1 (PDF/UA-1) structure tree requirements."
    },
    PDF_UA_TAG_NAME_MISSING: {
        section: "PDF/UA Accessibility",
        remediation: "Assign a valid structure tag (for example, /P, /H1, /L) to each element in the structure tree to preserve reading order.",
        reference: "ISO 14289-1 (PDF/UA-1) clause on semantic tagging."
    },
    PDF_UA_HEADING_HIERARCHY: {
        section: "PDF/UA Accessibility",
        remediation: "Reorder or retag headings so levels increment sequentially without skipping (H1 -> H2 -> H3).",
        reference: "ISO 14289-1 (PDF/UA-1) 7.8 Headings."
    },
    PDF_UA_ALT_TEXT_MISSING: {
        section: "PDF/UA Accessibility",
        remediation: "Provide meaningful alternative text using the /Alt or /ActualText entry on the Figure tag describing the visual content.",
        reference: "ISO 14289-1 (PDF/UA-1) 7.18 Non-text content; aligns with WCAG 1.1.1."
    },
    PDF_UA_MCID_WITHOUT_PAGE: {
        section: "PDF/UA Accessibility",
        remediation: "Ensure each structure element referencing an MCID also sets the /Pg entry so screen readers can map content to a page.",
        reference: "ISO 14289-1 (PDF/UA-1) mapping of structure elements."
    },
    PDF_UA_FORM_FIELD_LABEL_MISSING: {
        section: "PDF/UA Accessibility",
        remediation: "Populate the /TU (tooltip) or /T entry with a descriptive label and confirm the associated widget annotation has an /Alt entry.",
        reference: "ISO 14289-1 (PDF/UA-1) interactive form requirements; WCAG 3.3.2."
    },
    PDF_UA_VALIDATION_ERROR: {
        section: "PDF/UA Accessibility",
        remediation: "Review the tagged structure for inconsistencies; re-run tagging and validate with a PDF/UA checker after addressing parser errors.",
        reference: "ISO 14289-1 (PDF/UA-1)."
    },
    PDF_A_ENCRYPTED_OR_INVALID: {
        section: "PDF/A Compliance",
        remediation: "Remove passwords or DRM and resave the PDF without encryption before attempting PDF/A validation again.",
        reference: "ISO 19005 (PDF/A) prohibits encryption."
    },
    PDF_A_ENCRYPTED: {
        section: "PDF/A Compliance",
        remediation: "Disable encryption and security settings, then export as PDF/A so the document embeds no Encrypt dictionary.",
        reference: "ISO 19005 (PDF/A) 6.7 Encryption."
    },
    PDF_A_METADATA_MISSING_PART: {
        section: "PDF/A Compliance",
        remediation: "Add XMP metadata that declares pdfaid:part and pdfaid:conformance values matching the intended PDF/A level.",
        reference: "ISO 19005 (PDF/A) 6.7 Metadata."
    },
    PDF_A_METADATA_UNREADABLE: {
        section: "PDF/A Compliance",
        remediation: "Regenerate the XMP metadata using your authoring tool or an XMP editor so it is valid UTF-8 and declares PDF/A conformance.",
        reference: "ISO 19005 (PDF/A) XMP serialization rules."
    },
    PDF_A_METADATA_MISSING: {
        section: "PDF/A Compliance",
        remediation: "Embed an XMP metadata stream containing Dublin Core properties and pdfaid schema entries before exporting.",
        reference: "ISO 19005 (PDF/A) requires embedded XMP metadata."
    },
    PDF_A_FONT_DESCRIPTOR_MISSING: {
        section: "PDF/A Compliance",
        remediation: "Ensure every font resource references a FontDescriptor; re-export with 'Embed all fonts' enabled.",
        reference: "ISO 19005 (PDF/A) 6.2.11 Font embedding."
    },
    PDF_A_FONT_NOT_EMBEDDED: {
        section: "PDF/A Compliance",
        remediation: "Embed the font files (FontFile/FontFile2/FontFile3) so text renders consistently on any system.",
        reference: "ISO 19005 (PDF/A) requires all fonts embedded."
    },
    PDF_A_UNSUPPORTED_COLOR_SPACE: {
        section: "PDF/A Compliance",
        remediation: "Convert page content to an allowed device-independent color space like ICCBased or DeviceRGB before export.",
        reference: "ISO 19005 (PDF/A) 6.2.4 Color spaces."
    },
    PDF_A_COMPLEX_COLOR_SPACE: {
        section: "PDF/A Compliance",
        remediation: "Flatten complex color spaces to a permitted base (DeviceRGB/DeviceCMYK/ICCBased) before publishing.",
        reference: "ISO 19005 (PDF/A) color management guidance."
    },
    PDF_A_EXTERNAL_URI: {
        section: "PDF/A Compliance",
        remediation: "Remove or convert annotations that launch external URIs; PDF/A allows only internal navigation.",
        reference: "ISO 19005 (PDF/A) interactive content restrictions."
    },
    PDF_A_EXTERNAL_LAUNCH: {
        section: "PDF/A Compliance",
        remediation: "Delete launch actions from annotations or convert them to document-internal destinations.",
        reference: "ISO 19005 (PDF/A) prohibits external launch actions."
    },
    PDF_A_EXTERNAL_FILESPEC: {
        section: "PDF/A Compliance",
        remediation: "Replace external file references with embedded files or internal links compliant with PDF/A.",
        reference: "ISO 19005 (PDF/A) file specification rules."
    },
    PDF_A_VALIDATION_ERROR: {
        section: "PDF/A Compliance",
        remediation: "Run a dedicated PDF/A preflight profile and address the reported structural issues before revalidating.",
        reference: "ISO 19005 (PDF/A)."
    }
};

const DEFAULT_GUIDANCE: PdfIssueGuidance = {
    section: "PDF Structure Compliance",
    remediation: "Review the PDF's tagging, metadata, and embedded resources to satisfy PDF/UA and PDF/A requirements, then re-run validation.",
    reference: undefined
};

const PREFIX_TO_SECTION: Array<{ prefix: string; section: string }> = [
    { prefix: "PDF_UA_", section: "PDF/UA Accessibility" },
    { prefix: "PDF_A_", section: "PDF/A Compliance" }
];

function inferSectionFromCode(code: string): string {
    for (const mapping of PREFIX_TO_SECTION) {
        if (code.startsWith(mapping.prefix)) {
            return mapping.section;
        }
    }
    return DEFAULT_GUIDANCE.section;
}

export function getPdfStructureGuidance(issue: PdfStructureIssue): PdfIssueGuidance {
    const guidance = PDF_ISSUE_GUIDANCE[issue.code];
    if (guidance) {
        return guidance;
    }
    return {
        section: inferSectionFromCode(issue.code),
        remediation: DEFAULT_GUIDANCE.remediation,
        reference: DEFAULT_GUIDANCE.reference
    };
}


