
"use client";

import { Download, MoreVertical, SquarePen, Trash2, Workflow, History, Plus, Copy, Archive, Upload, Settings, Home, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from './ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useState } from 'react';
import Link from 'next/link';


export type View = 'notepad' | 'diagram';

interface CanvasHeaderProps {
  view: View;
  onViewChange: (view: View) => void;
  onExportMarkdown: () => void;
  onExportSVG: () => void;
  onDelete: () => void;
  canvasName: string;
  onCanvasNameChange: (name: string) => void;
  onCreateNew: () => void;
}

export function CanvasHeader({
  view,
  onViewChange,
  onExportMarkdown,
  onExportSVG,
  onDelete,
  canvasName,
  onCanvasNameChange,
  onCreateNew,
}: CanvasHeaderProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between p-2 px-4 bg-card/80 backdrop-blur-sm border-b"
    >
      <div className="flex items-center gap-2">
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem disabled>
                        <History className="w-4 h-4 mr-2" />
                        Version History
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                         <Link href="/">
                            <Home className="w-4 h-4 mr-2" />
                            Dashboard
                        </Link>
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={onCreateNew}>
                        <Plus className="w-4 h-4 mr-2" />
                        New File
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate File
                    </DropdownMenuItem>
                     <DropdownMenuItem disabled>
                        <Archive className="w-4 h-4 mr-2" />
                        Archive File
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem disabled>
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                    </DropdownMenuItem>
                     <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </DropdownMenuSubTrigger>
                         <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={onExportMarkdown}>Notes as Markdown</DropdownMenuItem>
                                <DropdownMenuItem onClick={onExportSVG}>Diagram as SVG</DropdownMenuItem>
                                <DropdownMenuItem disabled>Diagram as PNG</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                     <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Eye className="w-4 h-4 mr-2" />
                            Appearance
                        </DropdownMenuSubTrigger>
                         <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem>Light Mode</DropdownMenuItem>
                                <DropdownMenuItem>Dark Mode</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                     <DropdownMenuItem asChild>
                       <Link href="/settings">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Link>
                    </DropdownMenuItem>
                     <DropdownMenuSeparator />
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Canvas
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    canvas and remove your data from our servers.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Input 
            value={canvasName}
            onChange={(e) => onCanvasNameChange(e.target.value)}
            className="text-lg font-bold w-auto bg-transparent border-none focus-visible:ring-1 focus-visible:ring-offset-0"
        />
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <Tabs value={view} onValueChange={(value) => value && onViewChange(value as View)} className="w-full">
            <TabsList>
                <TabsTrigger value="notepad">
                    <SquarePen className="w-4 h-4 mr-2" />
                    Notepad
                </TabsTrigger>
                <TabsTrigger value="diagram">
                    <Workflow className="w-4 h-4 mr-2" />
                    Diagram
                </TabsTrigger>
            </TabsList>
        </Tabs>
      </div>
      <div className="flex items-center gap-2">
        {/* Export and other buttons are now inside the 3-dot menu */}
      </div>
    </header>
  );
}
