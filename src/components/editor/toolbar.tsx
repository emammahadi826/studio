
'use client';

import type { Editor } from "@tiptap/react";
import { useCurrentEditor } from "@tiptap/react";
import {
    Bold,
    Italic,
    Strikethrough,
    Code,
    Heading1,
    Heading2,
    Heading3,
    Pilcrow,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Code2,
    Quote,
    Link as LinkIcon,
    Plus,
    CaseSensitive,
    Move
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";
import { LinkSelector } from "./link-selector";
import { useState } from "react";
import { Toggle } from "../ui/toggle";


export function Toolbar({ onMouseDown, position }: { onMouseDown: (e: React.MouseEvent) => void, position: {x: number, y: number} }) {
    const { editor } = useCurrentEditor();
    const [isLinkSelectorOpen, setIsLinkSelectorOpen] = useState(false);

    if (!editor) {
        return null;
    }

    return (
        <div 
            className="absolute z-10 bg-card p-2 rounded-lg border shadow-md flex flex-col items-center gap-1"
            style={{ top: position.y, left: position.x }}
        >
             <div 
                className="cursor-move p-1 text-muted-foreground"
                onMouseDown={onMouseDown}
            >
                <Move className="w-4 h-4" />
            </div>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Plus className="w-4 h-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right">
                    <DropdownMenuItem onSelect={() => editor.chain().focus().setHardBreak().run()}>
                        Hard Break
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => editor.chain().focus().setHorizontalRule().run()}>
                        Horizontal Rule
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                       <CaseSensitive className="w-4 h-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right">
                    <DropdownMenuItem onSelect={() => editor.chain().focus().setParagraph().run()}>
                        <Pilcrow className="w-4 h-4 mr-2" /> Paragraph
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                        <Heading1 className="w-4 h-4 mr-2" /> Heading 1
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                         <Heading2 className="w-4 h-4 mr-2" /> Heading 2
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                        <Heading3 className="w-4 h-4 mr-2" /> Heading 3
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="horizontal" className="w-6 my-1" />

            
            <Toggle variant="outline" size="sm" onPressedChange={() => editor.chain().focus().toggleBold().run()} pressed={editor.isActive('bold')}>
                <Bold className="h-4 w-4" />
            </Toggle>
            <Toggle variant="outline" size="sm" onPressedChange={() => editor.chain().focus().toggleItalic().run()} pressed={editor.isActive('italic')}>
                <Italic className="h-4 w-4" />
            </Toggle>
            <Toggle variant="outline" size="sm" onPressedChange={() => editor.chain().focus().toggleStrike().run()} pressed={editor.isActive('strike')}>
                <Strikethrough className="h-4 w-4" />
            </Toggle>
             <Toggle variant="outline" size="sm" onPressedChange={() => editor.chain().focus().toggleCode().run()} pressed={editor.isActive('code')}>
                <Code className="h-4 w-4" />
            </Toggle>
            
            <Separator orientation="horizontal" className="w-6 my-1" />

             <Toggle variant="outline" size="sm" onPressedChange={() => editor.chain().focus().toggleBulletList().run()} pressed={editor.isActive('bulletList')}>
                <List className="h-4 w-4" />
            </Toggle>
            <Toggle variant="outline" size="sm" onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} pressed={editor.isActive('orderedList')}>
                <ListOrdered className="h-4 w-4" />
            </Toggle>
            
            <Separator orientation="horizontal" className="w-6 my-1" />
            
            <Toggle variant="outline" size="sm" onPressedChange={() => editor.chain().focus().setTextAlign('left').run()} pressed={editor.isActive({ textAlign: 'left' })}>
                <AlignLeft className="h-4 w-4" />
            </Toggle>
            <Toggle variant="outline" size="sm" onPressedChange={() => editor.chain().focus().setTextAlign('center').run()} pressed={editor.isActive({ textAlign: 'center' })}>
                <AlignCenter className="h-4 w-4" />
            </Toggle>
            <Toggle variant="outline" size="sm" onPressedChange={() => editor.chain().focus().setTextAlign('right').run()} pressed={editor.isActive({ textAlign: 'right' })}>
                <AlignRight className="h-4 w-4" />
            </Toggle>
             <Toggle variant="outline" size="sm" onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()} pressed={editor.isActive({ textAlign: 'justify' })}>
                <AlignJustify className="h-4 w-4" />
            </Toggle>

             <Separator orientation="horizontal" className="w-6 my-1" />

            <Toggle variant="outline" size="sm" onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()} pressed={editor.isActive('codeBlock')}>
                <Code2 className="h-4 w-4" />
            </Toggle>
            <Toggle variant="outline" size="sm" onPressedChange={() => editor.chain().focus().toggleBlockquote().run()} pressed={editor.isActive('blockquote')}>
                <Quote className="h-4 w-4" />
            </Toggle>

             <Separator orientation="horizontal" className="w-6 my-1" />
             
            <LinkSelector
                editor={editor}
                isOpen={isLinkSelectorOpen}
                setIsOpen={setIsLinkSelectorOpen}
            />

        </div>
    );
}

