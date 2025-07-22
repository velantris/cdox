"use client"

import { useEffect, useRef, useState } from "react";
import {
    Highlight,
    PdfHighlighter,
    PdfLoader,
    Popup
} from "react-pdf-highlighter";
import "react-pdf-highlighter/dist/style.css";

interface PdfViewerProps {
    documentUrl: string;
    selectedIssue: any;
    onIssueSelect: (issue: any) => void;
    issues: any[];
}

// Helper to create a highlight for an issue (simple text search, first match)
function getHighlightForIssue(issue: any, pdfText: string): any | null {
    if (!issue.originalText) return null;
    const text = issue.originalText.trim();
    const idx = pdfText.toLowerCase().indexOf(text.toLowerCase());
    if (idx === -1) return null;
    // This is a placeholder: react-pdf-highlighter expects position info, which requires PDF.js text mapping
    // For now, return null; real implementation would use pdfText mapping to position
    return null;
}

export function PdfViewer({ documentUrl, selectedIssue, onIssueSelect, issues }: PdfViewerProps) {
    const [highlights, setHighlights] = useState<any[]>([]);
    const [pdfText, setPdfText] = useState("");
    const scrollViewerTo = useRef<any>(() => { });

    // This effect would extract text from the PDF for highlight mapping (not implemented here)
    useEffect(() => {
        // TODO: Extract text from PDF and setPdfText
    }, [documentUrl]);

    // When issues or pdfText changes, create highlights
    useEffect(() => {
        // This is a placeholder: you would map issues to highlight objects here
        setHighlights([]); // No highlights until mapping is implemented
    }, [issues, pdfText]);

    // Scroll to selected issue highlight
    useEffect(() => {
        if (!selectedIssue) return;
        // TODO: Scroll to highlight for selectedIssue
    }, [selectedIssue, highlights]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '80vh' }}>
            <PdfLoader url={documentUrl} beforeLoad={<div>Loading PDF...</div>}>
                {(pdfDocument: any) => (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                        <PdfHighlighter
                            pdfDocument={pdfDocument}
                            enableAreaSelection={() => false}
                            onScrollChange={() => { }}
                            scrollRef={(scrollTo) => {
                                scrollViewerTo.current = scrollTo;
                            }}
                            onSelectionFinished={() => null}
                            highlightTransform={(highlight, index, setTip, hideTip, viewportToScaled, screenshot, isScrolledTo) => (
                                <Popup
                                    popupContent={null}
                                    onMouseOver={() => { }}
                                    onMouseOut={hideTip}
                                    key={index}
                                >
                                    <Highlight
                                        isScrolledTo={isScrolledTo}
                                        position={highlight.position}
                                        comment={highlight.comment}
                                    />
                                </Popup>
                            )}
                            highlights={highlights}
                        />
                    </div>
                )}
            </PdfLoader>
        </div>
    );
} 