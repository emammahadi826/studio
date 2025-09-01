
"use client";

import { EditorProvider, EditorProviderProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Toolbar } from "./toolbar";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import "./editor.css";

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
    return (
        <div className="w-full h-full flex flex-col relative rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring">
            <EditorProvider
                extensions={extensions}
                {...props}
                slotBefore={<Toolbar />}
            />
        </div>
    )
}
