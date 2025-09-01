
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
            className="absolute z-10 bg-card p-2 rounded-lg border shadow-md flex items-center gap-1"
            style={{ top: position.y, left: position.x }}
        >
             <div 
                className="cursor-move p-1 text-muted-foreground"
                onMouseDown={onMouseDown}
            >
                <Move className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-1">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
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
                        <Button variant="ghost" size="sm">
                           <CaseSensitive className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
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

                <Separator orientation="vertical" className="h-6" />

                <ToggleGroup type="multiple" size="sm">
                     <ToggleGroupItem value="bold" aria-label="Toggle bold" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive('bold')}>
                        <Bold className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="italic" aria-label="Toggle italic" onClick={() => editor.chain().focus().toggleItalic().run()} data-active={editor.isActive('italic')}>
                        <Italic className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="strike" aria-label="Toggle strike" onClick={() => editor.chain().focus().toggleStrike().run()} data-active={editor.isActive('strike')}>
                        <Strikethrough className="h-4 w-4" />
                    </ToggleGroupItem>
                     <ToggleGroupItem value="code" aria-label="Toggle code" onClick={() => editor.chain().focus().toggleCode().run()} data-active={editor.isActive('code')}>
                        <Code className="h-4 w-4" />
                    </ToggleGroupItem>
                </ToggleGroup>
                
                <Separator orientation="vertical" className="h-6" />

                 <Toggle
                    size="sm"
                    pressed={editor.isActive("bulletList")}
                    onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                    >
                    <List className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive("orderedList")}
                    onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <ListOrdered className="h-4 w-4" />
                </Toggle>
                
                <Separator orientation="vertical" className="h-6" />
                
                <ToggleGroup type="single" size="sm" defaultValue="left">
                    <ToggleGroupItem value="left" aria-label="Align left" onClick={() => editor.chain().focus().setTextAlign('left').run()} data-active={editor.isActive({ textAlign: 'left' })}>
                        <AlignLeft className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="center" aria-label="Align center" onClick={() => editor.chain().focus().setTextAlign('center').run()} data-active={editor.isActive({ textAlign: 'center' })}>
                        <AlignCenter className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="right" aria-label="Align right" onClick={() => editor.chain().focus().setTextAlign('right').run()} data-active={editor.isActive({ textAlign: 'right' })}>
                        <AlignRight className="h-4 w-4" />
                    </ToggleGroupItem>
                     <ToggleGroupItem value="justify" aria-label="Align justify" onClick={() => editor.chain().focus().setTextAlign('justify').run()} data-active={editor.isActive({ textAlign: 'justify' })}>
                        <AlignJustify className="h-4 w-4" />
                    </ToggleGroupItem>
                </ToggleGroup>

                 <Separator orientation="vertical" className="h-6" />

                <ToggleGroup type="single" size="sm">
                    <ToggleGroupItem value="codeBlock" aria-label="Code block" onClick={() => editor.chain().focus().toggleCodeBlock().run()} data-active={editor.isActive('codeBlock')}>
                        <Code2 className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="blockquote" aria-label="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} data-active={editor.isActive('blockquote')}>
                        <Quote className="h-4 w-4" />
                    </ToggleGroupItem>
                </ToggleGroup>

                 <Separator orientation="vertical" className="h-6" />
                 
                <LinkSelector
                    editor={editor}
                    isOpen={isLinkSelectorOpen}
                    setIsOpen={setIsLinkSelectorOpen}
                />

            </div>
        </div>
    );
}
