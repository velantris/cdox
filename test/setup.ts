import { beforeAll, vi } from 'vitest'
import React from 'react'

// Make React available globally for JSX
global.React = React

// Mock PDF.js worker
beforeAll(() => {
    // Mock PDF.js global worker options
    global.pdfjs = {
        GlobalWorkerOptions: {
            workerSrc: '/pdf.worker.min.mjs'
        }
    }

    // Mock document methods for DOM manipulation
    Object.defineProperty(document, 'createElement', {
        value: vi.fn().mockImplementation((tagName: string) => {
            const element = {
                tagName: tagName.toUpperCase(),
                id: '',
                textContent: '',
                nodeType: 1, // ELEMENT_NODE
                appendChild: vi.fn().mockImplementation((child) => child),
                querySelector: vi.fn(),
                querySelectorAll: vi.fn(() => []),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                style: {},
                classList: {
                    add: vi.fn(),
                    remove: vi.fn(),
                    contains: vi.fn(),
                },
                getBoundingClientRect: vi.fn(() => ({
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 20,
                    top: 0,
                    left: 0,
                    bottom: 20,
                    right: 100,
                })),
            }
            return element
        }),
        writable: true,
    })

    // Mock document.head for style injection
    Object.defineProperty(document, 'head', {
        value: {
            appendChild: vi.fn().mockImplementation((element) => {
                // Mock successful appendChild
                return element
            }),
            querySelector: vi.fn().mockReturnValue(null),
        },
        writable: true,
    })

    // Mock window methods
    Object.defineProperty(window, 'requestAnimationFrame', {
        value: vi.fn((callback: FrameRequestCallback) => {
            setTimeout(callback, 16)
            return 1
        }),
        writable: true,
    })

    // Mock performance.now
    Object.defineProperty(performance, 'now', {
        value: vi.fn(() => Date.now()),
        writable: true,
    })

    // Mock Range API for text selection
    global.Range = class Range {
        setStart = vi.fn()
        setEnd = vi.fn()
        setStartBefore = vi.fn()
        setEndAfter = vi.fn()
        selectNode = vi.fn()
        getBoundingClientRect = vi.fn(() => ({
            x: 0,
            y: 0,
            width: 100,
            height: 20,
            top: 0,
            left: 0,
            bottom: 20,
            right: 100,
        }))
    }

    Object.defineProperty(document, 'createRange', {
        value: () => new Range(),
        writable: true,
    })
})