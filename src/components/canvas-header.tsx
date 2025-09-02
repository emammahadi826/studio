
"use client";

import { Download, MoreVertical, SquarePen, Trash2, Workflow, History, Plus, Copy, Archive, Upload, Settings, Home, Eye, Edit, Check, Undo2, Redo2, Combine, Book, Spline } from 'lucide-react';
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


export type View = 'document' | 'canvas' | 'both';

interface CanvasHeaderProps {
  view: View;
  onViewChange: (view: View) => void;
  onExportMarkdown: () => void;
  onExportSVG: () => void;
  onDelete: () => void;
  canvasName: string;
  onCanvasNameChange: (name: string) => void;
  onCreateNew: () => void;
  isEditingName: boolean;
  onToggleEditName: (isEditing: boolean) => void;
  editingNameValue: string;
  onEditingNameChange: (value: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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
  isEditingName,
  onToggleEditName,
  editingNameValue,
  onEditingNameChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasHeaderProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const handleSaveName = () => {
    onCanvasNameChange(editingNameValue);
  };

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
                    <DropdownMenuItem onClick={onUndo} disabled={!canUndo}>
                        <Undo2 className="w-4 h-4 mr-2" />
                        Undo
                        <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={onRedo} disabled={!canRedo}>
                        <Redo2 className="w-4 h-4 mr-2" />
                        Redo
                        <DropdownMenuShortcut>⌘Y</DropdownMenuShortcut>
                    </DropdownMenuItem>
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

        {isEditingName ? (
          <div className="flex items-center gap-2">
            <Input 
                value={editingNameValue}
                onChange={(e) => onEditingNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') onToggleEditName(false);
                }}
                className="text-lg font-bold w-auto bg-transparent border-input focus-visible:ring-1 focus-visible:ring-offset-0 h-9"
                autoFocus
            />
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={handleSaveName}>
                <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold px-3 py-2">{canvasName}</h1>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => onToggleEditName(true)}>
                <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <Tabs value={view} onValueChange={(value) => value && onViewChange(value as View)} className="w-full">
            <TabsList>
                <TabsTrigger value="document">
                    <Book className="w-4 h-4 mr-2" />
                    Document
                </TabsTrigger>
                <TabsTrigger value="both">
                    <Combine className="w-4 h-4 mr-2" />
                    Both
                </TabsTrigger>
                <TabsTrigger value="canvas">
                    <Spline className="w-4 h-4 mr-2" />
                    Canvas
                </TabsTrigger>
            </TabsList>
        </Tabs>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
            <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
            <Redo2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
