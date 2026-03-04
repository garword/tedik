'use client';

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useRef, useState, useEffect, useCallback } from 'react';

export default function ResizableImageComponent({ node, updateAttributes, selected }: NodeViewProps) {
    const { src, alt, title, width, height, style } = node.attrs;
    const containerRef = useRef<HTMLDivElement>(null);
    const [resizing, setResizing] = useState(false);
    const [startDimensions, setStartDimensions] = useState({ w: 0, h: 0 });
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentHandle, setCurrentHandle] = useState<string | null>(null);

    const onMouseDown = (e: React.MouseEvent, handle: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!containerRef.current) return;

        // Get natural dimensions from the DOM element
        const rect = containerRef.current.getBoundingClientRect();

        setStartDimensions({ w: rect.width, h: rect.height });
        setStartPos({ x: e.clientX, y: e.clientY });
        setCurrentHandle(handle);
        setResizing(true);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizing || !currentHandle) return;

        e.preventDefault();

        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;

        let newWidth = startDimensions.w;
        let newHeight = startDimensions.h;

        // Maintain aspect ratio ONLY on corners
        const isProportional = ['nw', 'ne', 'sw', 'se'].includes(currentHandle);
        const ratio = startDimensions.w / startDimensions.h;

        switch (currentHandle) {
            case 'e':
                newWidth = startDimensions.w + dx;
                break;
            case 'w':
                newWidth = startDimensions.w - dx;
                break;
            case 's':
                newHeight = startDimensions.h + dy;
                break;
            case 'n':
                newHeight = startDimensions.h - dy;
                break;
            case 'se':
                newWidth = startDimensions.w + dx;
                newHeight = newWidth / ratio;
                break;
            case 'sw':
                newWidth = startDimensions.w - dx;
                newHeight = newWidth / ratio;
                break;
            case 'ne':
                newWidth = startDimensions.w + dx;
                newHeight = newWidth / ratio;
                break;
            case 'nw':
                newWidth = startDimensions.w - dx;
                newHeight = newWidth / ratio;
                break;
        }

        // enforce minimum size
        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(50, newHeight);

        updateAttributes({
            width: `${Math.round(newWidth)}px`,
            height: `${Math.round(newHeight)}px`
        });
    }, [resizing, currentHandle, startPos, startDimensions, updateAttributes]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (!resizing) return;
        e.preventDefault();
        setResizing(false);
        setCurrentHandle(null);
    }, [resizing]);

    useEffect(() => {
        if (resizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing, handleMouseMove, handleMouseUp]);

    // Use absolute positioning for handles
    const handleClasses = "absolute bg-white border border-emerald-500 rounded-sm z-50 pointer-events-auto shadow-sm";
    const cornerSize = "w-3 h-3";
    const edgeSize = "w-3 h-3";

    return (
        <NodeViewWrapper
            className={`inline-block relative max-w-full ${selected ? 'ring-2 ring-emerald-500' : ''}`}
            data-drag-handle
        >
            <div ref={containerRef} className="relative inline-block max-w-full group" style={{ width: width || 'auto', height: height || 'auto' }}>
                <img
                    src={src}
                    alt={alt}
                    title={title}
                    className="w-full h-full object-fill m-0 block"
                    style={{
                        objectFit: 'fill',
                        width: '100%',
                        height: '100%',
                        ...style
                    }}
                />

                {selected && (
                    <>
                        {/* Corners (Proportional) */}
                        <div className={`${handleClasses} ${cornerSize} -top-1.5 -left-1.5 cursor-nwse-resize`} onMouseDown={(e) => onMouseDown(e, 'nw')} />
                        <div className={`${handleClasses} ${cornerSize} -top-1.5 -right-1.5 cursor-nesw-resize`} onMouseDown={(e) => onMouseDown(e, 'ne')} />
                        <div className={`${handleClasses} ${cornerSize} -bottom-1.5 -left-1.5 cursor-nesw-resize`} onMouseDown={(e) => onMouseDown(e, 'sw')} />
                        <div className={`${handleClasses} ${cornerSize} -bottom-1.5 -right-1.5 cursor-nwse-resize`} onMouseDown={(e) => onMouseDown(e, 'se')} />

                        {/* Edges (Stretch) */}
                        <div className={`${handleClasses} ${edgeSize} -top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize`} onMouseDown={(e) => onMouseDown(e, 'n')} />
                        <div className={`${handleClasses} ${edgeSize} -bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize`} onMouseDown={(e) => onMouseDown(e, 's')} />
                        <div className={`${handleClasses} ${edgeSize} top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize`} onMouseDown={(e) => onMouseDown(e, 'w')} />
                        <div className={`${handleClasses} ${edgeSize} top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize`} onMouseDown={(e) => onMouseDown(e, 'e')} />
                    </>
                )}
            </div>
        </NodeViewWrapper>
    );
}
