'use client';

import { type ReactNode, isValidElement, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { PiiMask, type PiiMaskRegion } from './pii-mask';

// ---------------------------------------------------------------------------
// Custom remark plugin: ==text== → <mark> element
//
// Works in two passes so that `==` pairs are found even when remark-gfm
// transforms content between them into non-text nodes (e.g. autolinked
// emails become <a> nodes, splitting the surrounding == into separate
// text siblings).
//
//  Pass 1 – splitAtDelimiters:  split every text node at `==` boundaries
//           and insert lightweight sentinel nodes.
//  Pass 2 – pairSentinels:     match opening/closing sentinels and wrap
//           everything in between into a single `mark` node.
// ---------------------------------------------------------------------------

type MdastNode = {
    type: string;
    value?: string;
    children?: MdastNode[];
    data?: Record<string, unknown>;
};

const SENTINEL_TYPE = '__mark_sentinel__';

/**
 * Split every text node at `==` boundaries.
 * Each `==` becomes a lightweight sentinel node; surrounding text stays
 * as regular text nodes.  Non-text children pass through untouched.
 */
function splitAtDelimiters(children: MdastNode[]): MdastNode[] {
    const result: MdastNode[] = [];

    for (const child of children) {
        if (child.type !== 'text' || !child.value || !child.value.includes('==')) {
            result.push(child);
            continue;
        }

        const segments = child.value.split('==');
        for (let i = 0; i < segments.length; i++) {
            if (i > 0) result.push({ type: SENTINEL_TYPE });
            if (segments[i]) result.push({ type: 'text', value: segments[i] });
        }
    }

    return result;
}

/**
 * Pair consecutive sentinels: the first opens a `<mark>`, the next closes it.
 * Everything between becomes children of that mark node.
 * Unpaired sentinels are emitted back as literal `==` text.
 */
function pairSentinels(children: MdastNode[]): MdastNode[] {
    const result: MdastNode[] = [];
    let i = 0;

    while (i < children.length) {
        if (children[i].type !== SENTINEL_TYPE) {
            result.push(children[i]);
            i++;
            continue;
        }

        // Opening sentinel – scan forward for the closing one
        let j = i + 1;
        while (j < children.length && children[j].type !== SENTINEL_TYPE) {
            j++;
        }

        if (j < children.length && j > i + 1) {
            // Found a pair with content between them → wrap in mark
            result.push({
                type: 'mark',
                data: { hName: 'mark' },
                children: children.slice(i + 1, j),
            });
            i = j + 1;
        } else if (j < children.length && j === i + 1) {
            // Adjacent sentinels (====) → empty mark, skip both
            i = j + 1;
        } else {
            // No closing sentinel → emit literal ==
            result.push({ type: 'text', value: '==' });
            i++;
        }
    }

    return result;
}

/** Depth-first walk: resolve children first, then process this level. */
function walkTree(node: MdastNode): void {
    if (!node.children) return;

    for (const child of node.children) {
        walkTree(child);
    }

    node.children = pairSentinels(splitAtDelimiters(node.children));
}

function remarkMark() {
    return (tree: MdastNode) => {
        walkTree(tree);
    };
}

// ---------------------------------------------------------------------------
// PII pre-processing: wrap PII regions with ==…== markers
// ---------------------------------------------------------------------------

/**
 * Insert `==` delimiters around each PII region in the raw markdown source
 * so that `remarkMark` converts them to `<mark>` elements during parsing.
 *
 * Processes regions from end-to-start so earlier offsets stay valid.
 */
function wrapPiiRegions(text: string, regions: PiiMaskRegion[]): string {
    const sorted = [...regions].sort((a, b) => b.startOffset - a.startOffset);
    let result = text;

    for (const region of sorted) {
        const before = result.slice(0, region.startOffset);
        const piiText = result.slice(region.startOffset, region.endOffset);
        const after = result.slice(region.endOffset);
        result = `${before}==${piiText}==${after}`;
    }

    return result;
}

// ---------------------------------------------------------------------------
// React helpers
// ---------------------------------------------------------------------------

/**
 * Recursively extract the plain-text content from a React node tree.
 * Needed because a `<mark>` may contain non-text React elements (e.g. an
 * `<a>` produced by remark-gfm autolink) and `String(children)` would
 * return `[object Object]`.
 */
function extractText(node: ReactNode): string {
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (isValidElement(node)) {
        return extractText((node as React.ReactElement<{ children?: ReactNode }>).props.children);
    }
    return '';
}

// ---------------------------------------------------------------------------
// Markdown component
// ---------------------------------------------------------------------------

type MarkdownProps = {
    children: string;
    className?: string;
    piiMaskRegions?: PiiMaskRegion[];
    messageId?: string;
};

export function Markdown({ children, className, piiMaskRegions, messageId }: MarkdownProps) {
    // Pre-process: wrap PII regions with ==…== so remarkMark picks them up
    const processedContent = useMemo(
        () => (piiMaskRegions?.length ? wrapPiiRegions(children, piiMaskRegions) : children),
        [children, piiMaskRegions],
    );

    // Build text→piiType lookup so the mark renderer can label each region
    const piiTypeLookup = useMemo(() => {
        if (!piiMaskRegions?.length) return new Map<string, string>();
        const map = new Map<string, string>();
        for (const region of piiMaskRegions) {
            const piiText = children.slice(region.startOffset, region.endOffset);
            map.set(piiText, region.piiType);
        }
        return map;
    }, [children, piiMaskRegions]);

    return (
        <div className={`markdown-content ${className ?? ''}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMark]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    mark: ({ children: markChildren }: any) => {
                        const text = extractText(markChildren);
                        const piiType = piiTypeLookup.get(text) ?? 'spoiler';
                        return (
                            <PiiMask
                                text={text}
                                maskRegions={[
                                    {
                                        startOffset: 0,
                                        endOffset: text.length,
                                        piiType,
                                        originalLength: text.length,
                                    },
                                ]}
                                messageId={messageId}
                            />
                        );
                    },
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
}
