"use client"

import { cn } from "@/lib/utils"
import { useCallback, useEffect, useMemo, useState } from "react"

// Add custom CSS for enhanced animations and visual effects
const highlightStyles = `
  @keyframes fadeInScale {
    0% {
      opacity: 0;
      transform: scale(0.8);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  

  
  @keyframes shimmerHighlight {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @keyframes bounceIn {
    0% {
      opacity: 0;
      transform: scale(0.3) rotate(-10deg);
    }
    50% {
      opacity: 1;
      transform: scale(1.1) rotate(5deg);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
  }
  
  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }
  

  
  .highlight-shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    background-size: 200% 100%;
    animation: shimmerHighlight 2s infinite;
  }
  
  .highlight-bounce-in {
    animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
  
  .highlight-ripple::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: translate(-50%, -50%);
    animation: ripple 0.6s linear;
  }
`

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style')
    styleElement.textContent = highlightStyles
    document.head.appendChild(styleElement)
}

export interface Highlight {
    id: string
    issueId: string
    startOffset: number
    endOffset: number
    pageNumber: number
    severity: 'low' | 'medium' | 'high' | 'critical'
    boundingRect?: {
        x: number
        y: number
        width: number
        height: number
    }
}

interface PdfHighlightOverlayProps {
    highlights: Highlight[]
    pageNumber: number
    scale: number
    pageRef: React.RefObject<HTMLDivElement | null>
    onHighlightClick?: (highlight: Highlight) => void
}

// Enhanced severity-based color mapping with improved visual hierarchy and accessibility
const SEVERITY_COLORS = {
    critical: {
        background: 'rgba(220, 38, 38, 0.2)', // Red - Critical issues
        border: '#dc2626',
        hover: 'rgba(220, 38, 38, 0.3)',
        shadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
        glow: '0 0 0 3px rgba(220, 38, 38, 0.15)',
        gradient: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(239, 68, 68, 0.3))',
        pulse: 'rgba(220, 38, 38, 0.4)'
    },
    high: {
        background: 'rgba(234, 88, 12, 0.2)', // Orange - High priority issues
        border: '#ea580c',
        hover: 'rgba(234, 88, 12, 0.3)',
        shadow: '0 4px 10px rgba(234, 88, 12, 0.25)',
        glow: '0 0 0 3px rgba(234, 88, 12, 0.15)',
        gradient: 'linear-gradient(135deg, rgba(234, 88, 12, 0.2), rgba(251, 146, 60, 0.3))',
        pulse: 'rgba(234, 88, 12, 0.4)'
    },
    medium: {
        background: 'rgba(250, 204, 21, 0.2)', // Yellow - Medium priority issues
        border: '#facc15',
        hover: 'rgba(250, 204, 21, 0.3)',
        shadow: '0 4px 10px rgba(250, 204, 21, 0.25)',
        glow: '0 0 0 3px rgba(250, 204, 21, 0.15)',
        gradient: 'linear-gradient(135deg, rgba(250, 204, 21, 0.2), rgba(254, 240, 138, 0.3))',
        pulse: 'rgba(250, 204, 21, 0.4)'
    },
    low: {
        background: 'rgba(22, 163, 74, 0.2)', // Green - Low priority issues
        border: '#16a34a',
        hover: 'rgba(22, 163, 74, 0.3)',
        shadow: '0 4px 10px rgba(22, 163, 74, 0.25)',
        glow: '0 0 0 3px rgba(22, 163, 74, 0.15)',
        gradient: 'linear-gradient(135deg, rgba(22, 163, 74, 0.2), rgba(34, 197, 94, 0.3))',
        pulse: 'rgba(22, 163, 74, 0.4)'
    }
}

export function PdfHighlightOverlay({
    highlights,
    pageNumber,
    scale,
    pageRef,
    onHighlightClick
}: PdfHighlightOverlayProps) {
    const [renderedHighlights, setRenderedHighlights] = useState<(Highlight & {
        boundingRect: { x: number; y: number; width: number; height: number }
    })[]>([])

    // Filter highlights for current page - memoize to prevent infinite loops
    const pageHighlights = useMemo(() =>
        highlights.filter(h => h.pageNumber === pageNumber),
        [highlights, pageNumber]
    )

    // Memoize the calculation function to prevent recreating on every render
    const calculateHighlightPositions = useCallback(async () => {
        const pageElement = pageRef.current
        if (!pageElement) return

        const textLayer = pageElement.querySelector('.react-pdf__Page__textContent')
        if (!textLayer) return

        const newRenderedHighlights: (Highlight & {
            boundingRect: { x: number; y: number; width: number; height: number }
        })[] = []

        for (const highlight of pageHighlights) {
            const boundingRect = await calculateTextBoundingRect(
                textLayer as HTMLElement,
                highlight.startOffset,
                highlight.endOffset
            )

            if (boundingRect) {
                newRenderedHighlights.push({
                    ...highlight,
                    boundingRect
                })
            }
        }

        setRenderedHighlights(newRenderedHighlights)
    }, [pageHighlights, pageRef])

    useEffect(() => {
        if (!pageRef.current || pageHighlights.length === 0) {
            setRenderedHighlights([])
            return
        }

        // Delay calculation to ensure text layer is rendered
        const timer = setTimeout(calculateHighlightPositions, 100)
        return () => clearTimeout(timer)
    }, [calculateHighlightPositions, pageHighlights.length])

    return (
        <div className="absolute inset-0 pointer-events-none">
            {renderedHighlights.map((highlight) => (
                <HighlightBox
                    key={highlight.id}
                    highlight={highlight}
                    scale={scale}
                    onClick={onHighlightClick}
                />
            ))}
        </div>
    )
}

interface HighlightBoxProps {
    highlight: Highlight & {
        boundingRect: { x: number; y: number; width: number; height: number }
    }
    scale: number
    onClick?: (highlight: Highlight) => void
}

function HighlightBox({ highlight, scale, onClick }: HighlightBoxProps) {
    const colors = SEVERITY_COLORS[highlight.severity]
    const [isHovered, setIsHovered] = useState(false)
    const [isActive, setIsActive] = useState(false)
    const [showRipple, setShowRipple] = useState(false)

    const handleClick = () => {
        if (onClick) {
            setIsActive(true)
            setShowRipple(true)
            onClick(highlight)

            // Reset states after animations
            setTimeout(() => setIsActive(false), 300)
            setTimeout(() => setShowRipple(false), 600)
        }
    }

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return '⚠️'
            case 'high': return '🔶'
            case 'medium': return '⚡'
            case 'low': return '✅'
            default: return '📍'
        }
    }

    const getSeverityLabel = (severity: string) => {
        return severity.charAt(0).toUpperCase() + severity.slice(1)
    }

    return (
        <div
            className={cn(
                "absolute transition-all duration-300 ease-out cursor-pointer",
                "border-2 rounded-lg overflow-hidden",
                "transform-gpu", // Enable GPU acceleration
                onClick && "pointer-events-auto",
                isHovered && "scale-105 z-20", // Subtle scale on hover with higher z-index
                isActive && "scale-110", // Slightly larger scale on click
                showRipple && "highlight-ripple"
            )}
            style={{
                left: highlight.boundingRect.x * scale,
                top: highlight.boundingRect.y * scale,
                width: highlight.boundingRect.width * scale,
                height: highlight.boundingRect.height * scale,
                background: isHovered ? colors.gradient : colors.background,
                borderColor: colors.border,
                borderWidth: isHovered ? '3px' : '2px',
                boxShadow: isHovered
                    ? `${colors.shadow}, ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`
                    : `0 1px 3px rgba(0,0,0,0.1)`,
                zIndex: isHovered ? 20 : 10,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                // Add subtle inner shadow for depth
                ...(isHovered && {
                    boxShadow: `${colors.shadow}, ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1)`
                })
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            title={`${getSeverityIcon(highlight.severity)} ${getSeverityLabel(highlight.severity)} severity issue - Click to focus`}
            data-highlight-id={highlight.id}
        >
            {/* Animated shimmer effect on hover */}
            {isHovered && (
                <div
                    className="absolute inset-0 highlight-shimmer opacity-30"
                    style={{
                        background: `linear-gradient(90deg, transparent, ${colors.pulse}, transparent)`,
                        backgroundSize: '200% 100%'
                    }}
                />
            )}

            {/* Enhanced severity indicator badge with improved animations */}
            {isHovered && (
                <div
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xl transition-all duration-300 highlight-bounce-in z-30"
                    style={{
                        backgroundColor: colors.border,
                        boxShadow: `0 4px 12px ${colors.border}40, 0 0 0 2px rgba(255,255,255,0.2), 0 0 20px ${colors.border}20`
                    }}
                >
                    <span className="animate-pulse">{getSeverityIcon(highlight.severity)}</span>
                </div>
            )}

            {/* Hover tooltip with severity information */}
            {isHovered && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-40 highlight-bounce-in">
                    <div className="flex items-center space-x-2">
                        <span>{getSeverityIcon(highlight.severity)}</span>
                        <span className="font-semibold">{getSeverityLabel(highlight.severity)} Issue</span>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
            )}

            {/* Severity level indicator bar */}
            <div
                className="absolute bottom-0 left-0 right-0 h-1 transition-all duration-300"
                style={{
                    backgroundColor: colors.border,
                    opacity: isHovered ? 1 : 0.6,
                    transform: isHovered ? 'scaleY(1.5)' : 'scaleY(1)'
                }}
            />

            {/* Corner accent for visual hierarchy */}
            <div
                className="absolute top-0 right-0 w-0 h-0 transition-all duration-300"
                style={{
                    borderLeft: isHovered ? '12px solid transparent' : '8px solid transparent',
                    borderTop: isHovered ? `12px solid ${colors.border}` : `8px solid ${colors.border}`,
                    opacity: 0.8
                }}
            />
        </div>
    )
}

/**
 * Calculates the bounding rectangle for text within a given offset range
 */
async function calculateTextBoundingRect(
    textLayer: HTMLElement,
    startOffset: number,
    endOffset: number
): Promise<{ x: number; y: number; width: number; height: number } | null> {
    try {
        // Get all text spans in the text layer
        const textSpans = Array.from(textLayer.querySelectorAll('span'))

        let currentOffset = 0
        let startElement: HTMLElement | null = null
        let endElement: HTMLElement | null = null
        let startCharIndex = 0
        let endCharIndex = 0

        // Find the elements containing start and end positions
        for (const span of textSpans) {
            const spanText = span.textContent || ''
            const spanLength = spanText.length

            if (startElement === null && currentOffset + spanLength > startOffset) {
                startElement = span
                startCharIndex = startOffset - currentOffset
            }

            if (endElement === null && currentOffset + spanLength >= endOffset) {
                endElement = span
                endCharIndex = endOffset - currentOffset
                break
            }

            currentOffset += spanLength + 1 // +1 for space between spans
        }

        if (!startElement || !endElement) {
            return null
        }

        // Create a range to get the bounding rectangle
        const range = document.createRange()

        if (startElement === endElement) {
            // Text is within a single element
            const textNode = startElement.firstChild
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                range.setStart(textNode, Math.max(0, startCharIndex))
                range.setEnd(textNode, Math.min(textNode.textContent?.length || 0, endCharIndex))
            } else {
                range.selectNode(startElement)
            }
        } else {
            // Text spans multiple elements
            const startTextNode = startElement.firstChild
            const endTextNode = endElement.firstChild

            if (startTextNode && startTextNode.nodeType === Node.TEXT_NODE) {
                range.setStart(startTextNode, Math.max(0, startCharIndex))
            } else {
                range.setStartBefore(startElement)
            }

            if (endTextNode && endTextNode.nodeType === Node.TEXT_NODE) {
                range.setEnd(endTextNode, Math.min(endTextNode.textContent?.length || 0, endCharIndex))
            } else {
                range.setEndAfter(endElement)
            }
        }

        const rect = range.getBoundingClientRect()
        const textLayerRect = textLayer.getBoundingClientRect()

        // Convert to relative coordinates within the text layer
        return {
            x: rect.left - textLayerRect.left,
            y: rect.top - textLayerRect.top,
            width: rect.width,
            height: rect.height
        }
    } catch (error) {
        console.error('Error calculating text bounding rect:', error)
        return null
    }
}