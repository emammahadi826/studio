
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
          onClick={(e) => {
            if (editor.state.selection.empty) {
                e.preventDefault();
                alert("Please select text to apply a link.");
                setIsOpen(false);
            }
          }}
        >
          <Link className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            type="url"
            placeholder="https://example.com"
            className="flex-1"
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink(url);
                }
            }}
          />
           <Button size="sm" onClick={() => applyLink(url)} className="h-8">
              Apply
          </Button>
        </div>
         {editor.getAttributes("link").href && (
            <Button
            variant="outline"
            size="sm"
            type="button"
            className="text-red-500 border-red-500/50 hover:bg-red-500/10 hover:text-red-500 w-full mt-2"
            onClick={() => removeLink()}
            >
            Remove link
            </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};
