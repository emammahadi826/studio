
"use client";

import { cn } from "@/lib/utils";
import { useCurrentEditor, type Editor } from "@tiptap/react";
import {
  Check,
  ChevronDown,
  Link,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "../ui/button";
import { PopoverClose } from "@radix-ui/react-popover";
import { useCallback, useEffect, useState } from "react";

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
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          data-active={editor.isActive('link')}
        >
          <Link className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-2">
        <div className="flex p-1">
          <input
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            type="url"
            placeholder="Paste a link"
            className="flex-1 bg-transparent p-1 text-sm outline-none"
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    applyLink(url);
                }
            }}
          />
          {editor.getAttributes("link").href ? (
            <Button
              size="icon"
              variant="outline"
              type="button"
              className="flex h-8 items-center rounded-sm p-1 text-red-500"
              onClick={() => removeLink()}
            >
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-unlink-2"><path d="M15 7h2a5 5 0 0 1 0 10h-2m-6 0H7A5 5 0 0 1 7 7h2"/></svg>
            </Button>
          ) : (
             <Button size="icon" className="h-8" onClick={() => applyLink(url)}>
                <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
