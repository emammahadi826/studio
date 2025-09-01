
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
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
        >
          <Link className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0 border-0">
          <DialogContent className="p-4 relative">
             <DialogHeader>
                <DialogTitle>Edit Link</DialogTitle>
            </DialogHeader>
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
            </div>
            <DialogFooter className="!justify-between">
                {editor.getAttributes("link").href ? (
                    <Button
                    variant="outline"
                    type="button"
                    className="text-red-500 border-red-500/50 hover:bg-red-500/10 hover:text-red-500"
                    onClick={() => removeLink()}
                    >
                    Remove link
                    </Button>
                ) : <div />}
                <Button size="sm" onClick={() => applyLink(url)}>
                    Apply
                </Button>
            </DialogFooter>
          </DialogContent>
      </PopoverContent>
    </Popover>
  );
};
