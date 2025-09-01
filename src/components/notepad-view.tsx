
"use client";

import { Editor } from "./editor/editor";

interface NotepadViewProps {
  content: string;
  onContentChange: (content: string) => void;
}

export function NotepadView({ content, onContentChange }: NotepadViewProps) {
  return (
    <div className="w-full h-full">
      <div className="w-full h-full max-w-4xl mx-auto p-4 md:p-8">
        <Editor
            content={content}
            onUpdate={({ editor }) => {
                onContentChange(editor.getHTML());
            }}
        />
      </div>
    </div>
  );
}
