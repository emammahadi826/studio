
"use client";

import { cn } from "@/lib/utils";
import { useCurrentEditor, type Editor } from "@tiptap/react";
import {
  Check,
  Trash2,
  Link,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "../ui/button";
import { useCallback, useEffect, useState } from "react";
import { Input } from "../ui/input";

export const LinkSelector = ({
  editor,
  isOpen,
  setIsOpen,
}: {
  editor: Editor;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) => {
  const [url, setUrl] = useState<string>("");

  const applyLink = useCallback(
    (url: string) => {
      if (url) {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      } else {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
      }
      setIsOpen(false);
      setUrl("");
    },
    [editor, setIsOpen]
  );
  
  const removeLink = useCallback(() => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setIsOpen(false);
    setUrl("");
  }, [editor, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      setUrl(editor.getAttributes("link").href || "");
    }
  }, [isOpen, editor]);

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
        if (!open) {
            applyLink(url);
        }
        setIsOpen(open);
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          data-active={editor.isActive('link')}
          onClick={(e) => {
            if (editor.state.selection.empty) {
                e.preventDefault();
                setIsOpen(false);
                // We can't use toast here directly, so an alert is the simplest feedback
                if (typeof window !== 'undefined') {
                    window.alert("Please select text to apply a link.");
                }
            } else {
                setIsOpen(!isOpen);
            }
          }}
        >
          <Link className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start" side="bottom">
        <div className="flex items-center gap-1">
          <Input
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            type="url"
            placeholder="Paste a link"
            className="flex-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink(url);
                }
                if(e.key === 'Escape') {
                    e.preventDefault();
                    setIsOpen(false);
                }
            }}
          />
           <Button size="icon" variant="ghost" onClick={() => applyLink(url)} className="h-8 w-8">
              <Check className="h-4 w-4" />
          </Button>
         {editor.getAttributes("link").href && (
            <Button
                variant="ghost"
                size="icon"
                type="button"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                onClick={() => removeLink()}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
