"use client";

import { Textarea } from "@/components/ui/textarea";

interface NotepadViewProps {
  content: string;
  onContentChange: (content: string) => void;
}

export function NotepadView({ content, onContentChange }: NotepadViewProps) {
  return (
    <div className="w-full h-full p-4 md:p-8">
      <Textarea
        placeholder="Start writing your notes here... then switch to the Diagram view and let AI visualize them for you!"
        className="w-full h-full max-w-4xl mx-auto text-base resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-2 leading-relaxed"
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
      />
    </div>
  );
}
