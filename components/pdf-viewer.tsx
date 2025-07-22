"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";
import {
    Highlight,
    PdfHighlighter,
    PdfLoader,
    Popup,
} from "react-pdf-highlighter";
import "react-pdf-highlighter/dist/style.css";

/* ------------------------------------------------------------------
 Types
-------------------------------------------------------------------*/

type Severity = "critical" | "high" | "medium" | "low" | "unknown";

interface Issue {
    _id: string;
    originalText: string;
    issueExplanation?: string;
    severity: Severity;
}

interface HighlightRect {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width: number;
    height: number;
    left: number; // added
    top: number;  // added
}

interface PdfTextMatch {
    pageNumber: number;
    rects: HighlightRect[];
    boundingRect: HighlightRect;
}

interface HighlightData {
    id: string;
    content: {
        text: string;
    };
    position: PdfTextMatch;
    comment: {
        text: string;
        emoji: string;
    };
    issue: Issue;
}

interface PdfViewerProps {
    documentUrl: string;
    selectedIssue: Issue | null;
    onIssueSelect: (issue: Issue) => void;
    issues: Issue[];
}

/* ------------------------------------------------------------------
 Helpers
-------------------------------------------------------------------*/

const SEVERITY_EMOJI: Record<Severity, string> = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🟢",
    unknown: "⚪",
};

const SEVERITY_COLOR: Record<Severity, string> = {
    critical: "#EF4444",
    high: "#F97316",
    medium: "#EAB308",
    low: "#22C55E",
    unknown: "#6B7280",
};

function getSeverityEmoji(severity: Severity) {
    return SEVERITY_EMOJI[severity] ?? SEVERITY_EMOJI.unknown;
}

function getSeverityColor(severity: Severity) {
    return SEVERITY_COLOR[severity] ?? SEVERITY_COLOR.unknown;
}

// --- Text utilities ------------------------------------------------

const clean = (txt: string) =>
    txt.toLowerCase().replace(/[\n\r]+/g, " ").replace(/[\s]+/g, " ").trim();

/* ------------------------------------------------------------------
 findTextInPdf
  – Heuristic search that prefers exact match but gracefully falls back.
-------------------------------------------------------------------*/
async function findTextInPDF(
    pdfDocument: any,
    searchText: string
): Promise<PdfTextMatch | null> {
    if (!pdfDocument) return null;
    const target = clean(searchText);
    if (!target) return null;

    const numPages = pdfDocument.numPages;

    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });

        let pageOffset = 0;
        let mergedText = "";
        const itemsMeta: Array<{
            str: string;
            start: number;
            end: number;
            transform: number[];
            width: number;
            height: number;
        }> = [];

        for (const item of textContent.items as any[]) {
            const str = clean(item.str);
            if (!str) continue;
            const start = pageOffset;
            const end = start + str.length;
            itemsMeta.push({
                str,
                start,
                end,
                transform: item.transform,
                width: item.width ?? 0,
                height: item.height ?? 0,
            });
            mergedText += `${str} `;
            pageOffset = end + 1;
        }

        const index = mergedText.indexOf(target);
        if (index === -1) continue; // try next page

        const endIndex = index + target.length;

        const matchItems = itemsMeta.filter(
            (m) => m.start <= endIndex && m.end >= index
        );

        if (!matchItems.length) continue;

        const rects: HighlightRect[] = matchItems.map((m) => {
            const [scaleX, skewX, skewY, scaleY, translateX, translateY] =
                m.transform;
            const x = translateX;
            const y = viewport.height - translateY;
            return {
                x1: x,
                y1: y - m.height,
                x2: x + m.width,
                y2: y,
                width: viewport.width,
                height: viewport.height,
                left: x,           // added
                top: y - m.height, // added
            };
        });

        const minX = Math.min(...rects.map((r) => r.x1));
        const minY = Math.min(...rects.map((r) => r.y1));
        const maxX = Math.max(...rects.map((r) => r.x2));
        const maxY = Math.max(...rects.map((r) => r.y2));

        return {
            pageNumber,
            rects,
            boundingRect: {
                x1: minX,
                y1: minY,
                x2: maxX,
                y2: maxY,
                width: viewport.width,
                height: viewport.height,
                left: minX, // added
                top: minY,  // added
            },
        };
    }
    return null;
}

/* ------------------------------------------------------------------
 createHighlightsFromIssues
-------------------------------------------------------------------*/
async function createHighlightsFromIssues(
    issues: Issue[],
    pdfDocument: any,
    signal: AbortSignal
): Promise<HighlightData[]> {
    const tasks = issues.map(async (issue) => {
        if (signal.aborted) return null;
        const match = await findTextInPDF(pdfDocument, issue.originalText);
        const severity = (issue.severity ?? "unknown") as Severity;

        const base: Omit<HighlightData, "position"> = {
            id: issue._id,
            content: { text: issue.originalText.trim() },
            comment: {
                text: issue.issueExplanation ?? "",
                emoji: getSeverityEmoji(severity),
            },
            issue,
        };

        if (match) {
            return {
                ...base,
                position: match,
            } as HighlightData;
        }

        // fallback placeholder (top‑left)
        return {
            ...base,
            position: {
                pageNumber: 1,
                rects: [
                    {
                        x1: 48,
                        y1: 96,
                        x2: 300,
                        y2: 112,
                        width: 595,
                        height: 842,
                        left: 48, // added
                        top: 96,  // added
                    },
                ],
                boundingRect: {
                    x1: 48,
                    y1: 96,
                    x2: 300,
                    y2: 112,
                    width: 595,
                    height: 842,
                    left: 48, // added
                    top: 96,  // added
                },
            },
        } as HighlightData;
    });

    const results = await Promise.all(tasks);
    return results.filter(Boolean) as HighlightData[];
}

/* ------------------------------------------------------------------
 Component
-------------------------------------------------------------------*/

export function PdfViewer({
    documentUrl,
    selectedIssue,
    onIssueSelect,
    issues,
}: PdfViewerProps) {
    const [highlights, setHighlights] = useState<HighlightData[]>([]);
    const [pdfDocument, setPdfDocument] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<((h: HighlightData) => void) | null>(null);

    /* --------------------------------------------------------------
     Generate highlights whenever pdf or issues change
    --------------------------------------------------------------*/
    useEffect(() => {
        if (!pdfDocument || !issues.length) {
            setHighlights([]);
            return;
        }

        const controller = new AbortController();
        setIsLoading(true);

        createHighlightsFromIssues(issues, pdfDocument, controller.signal)
            .then((hs) => !controller.signal.aborted && setHighlights(hs))
            .finally(() => !controller.signal.aborted && setIsLoading(false));

        return () => controller.abort();
    }, [issues, pdfDocument]);

    /* --------------------------------------------------------------
     Auto‑scroll to selected issue
    --------------------------------------------------------------*/
    useEffect(() => {
        if (!selectedIssue || !scrollRef.current || !highlights.length) return;
        const target = highlights.find((h) => h.id === selectedIssue._id);
        if (target) scrollRef.current(target);
    }, [selectedIssue, highlights]);

    /* --------------------------------------------------------------
     Render helpers
    --------------------------------------------------------------*/
    const renderHighlight = useCallback(
        (
            h: HighlightData,
            _idx: number,
            setTip: any,
            hideTip: any,
            _toScaled: any,
            _screenshot: any,
            isScrolledTo: boolean
        ) => {
            const severityColor = getSeverityColor(h.issue.severity as Severity);
            const isSelected = selectedIssue?._id === h.id;
            return (
                <Popup
                    key={h.id}
                    popupContent={
                        <div className="bg-white p-3 rounded shadow-lg border max-w-xs z-[999]">
                            <div className="flex items-center gap-2 mb-1 text-sm font-medium">
                                <span>{h.comment.emoji}</span>
                                <span className="capitalize">{h.issue.severity} issue</span>
                            </div>
                            <p className="text-xs text-gray-700 break-words mb-2">
                                {h.comment.text}
                            </p>
                            <button
                                className="text-xs text-blue-600 hover:underline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onIssueSelect(h.issue);
                                    hideTip();
                                }}
                            >
                                Focus
                            </button>
                        </div>
                    }
                    onMouseOver={(c) => setTip(c)}
                    onMouseOut={hideTip}
                >
                    <Highlight
                        isScrolledTo={isScrolledTo}
                        position={h.position}
                        comment={h.comment}
                        onClick={() => {
                            onIssueSelect(h.issue);
                        }}
                    />
                </Popup>
            );
        },
        [onIssueSelect, selectedIssue]
    );

    /* --------------------------------------------------------------
     Render
    --------------------------------------------------------------*/
    if (!documentUrl) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-md text-gray-500">
                No document selected
            </div>
        );
    }

    return (
        <div className="relative w-full h-[80vh] bg-gray-100 rounded-md overflow-hidden">
            <PdfLoader
                url={documentUrl}
                beforeLoad={
                    <div className="flex h-full w-full items-center justify-center text-gray-600">
                        Loading PDF…
                    </div>
                }
                errorMessage={
                    <div className="flex h-full w-full items-center justify-center text-red-600">
                        Failed to load PDF
                    </div>
                }
            >
                {(doc: any) => {
                    // Store doc only once (object identity stable)
                    if (pdfDocument == null) setPdfDocument(doc);

                    return (
                        <div style={{ height: "100%", overflow: "auto" }}>
                            <PdfHighlighter
                                pdfDocument={doc}
                                enableAreaSelection={() => false}
                                onScrollChange={() => { }}
                                scrollRef={(s) => (scrollRef.current = s)}
                                onSelectionFinished={() => null}
                                highlightTransform={renderHighlight}
                                highlights={highlights}
                            />
                        </div>
                    );
                }}
            </PdfLoader>

            {/* Status badge */}
            {(isLoading || highlights.length) && (
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded px-3 py-1 text-sm shadow">
                    {isLoading ? "Processing…" : `${highlights.length} highlight(s)`}
                </div>
            )}
        </div>
    );
}
