
"use client";

import { EditorProvider, EditorProviderProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Toolbar } from "./toolbar";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import "./editor.css";
import { useState, useRef } from "react";

interface EditorProps extends Omit<EditorProviderProps, 'slotBefore' | 'slotAfter' | 'extensions'> {
}

const extensions = [
  StarterKit,
  Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: "https",
    HTMLAttributes: {
      class: "underline",
    },
  }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
    alignments: ["left", "center", "right", "justify"],
    defaultAlignment: "left",
  }),
];

export function Editor(props: EditorProps) {
    const [toolbarPosition, setToolbarPosition] = useState({ x: 16, y: 16 });
    const [isDragging, setIsDragging] = useState(false);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0, toolbarX: 0, toolbarY: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX,
            y: e.clientY,
            toolbarX: toolbarPosition.x,
            toolbarY: toolbarPosition.y
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        
        if (editorContainerRef.current) {
            const containerRect = editorContainerRef.current.getBoundingClientRect();
            const toolbarWidth = 450; 
            const toolbarHeight = 52;

            let newX = dragStartPos.current.toolbarX + dx;
            let newY = dragStartPos.current.toolbarY + dy;

            newX = Math.max(0, Math.min(newX, containerRect.width - toolbarWidth));
            newY = Math.max(0, Math.min(newY, containerRect.height - toolbarHeight));
            
            setToolbarPosition({ x: newX, y: newY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    return (
        <div ref={editorContainerRef} className="w-full h-full flex flex-col relative rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring">
            <EditorProvider
                extensions={extensions}
                {...props}
            >
                <Toolbar onMouseDown={handleMouseDown} position={toolbarPosition} />
            </EditorProvider>
        </div>
    )
}
