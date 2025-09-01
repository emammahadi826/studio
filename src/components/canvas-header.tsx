
"use client";

import { Download, MoreVertical, SquarePen, Trash2, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSidebar } from './ui/sidebar';
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


export type View = 'notepad' | 'diagram';

interface CanvasHeaderProps {
  view: View;
  onViewChange: (view: View) => void;
  onExportMarkdown: () => void;
  onExportSVG: () => void;
  onDelete: () => void;
  canvasName: string;
  onCanvasNameChange: (name: string) => void;
}

export function CanvasHeader({
  view,
  onViewChange,
  onExportMarkdown,
  onExportSVG,
  onDelete,
  canvasName,
  onCanvasNameChange,
}: CanvasHeaderProps) {
  const { state, isMobile } = useSidebar();
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  return (
    <header 
      className="fixed top-0 right-0 z-20 flex items-center justify-between p-2 px-4 bg-card/80 backdrop-blur-sm border-b transition-[left] ease-linear"
      style={{ left: isMobile ? '0px' : (state === 'expanded' ? 'var(--sidebar-width)' : 'var(--sidebar-width-icon)') }}
    >
      <Input 
        value={canvasName}
        onChange={(e) => onCanvasNameChange(e.target.value)}
        className="text-lg font-bold w-auto bg-transparent border-none focus-visible:ring-1 focus-visible:ring-offset-0"
      />
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportMarkdown}>Export Notes as Markdown</DropdownMenuItem>
            <DropdownMenuItem onClick={onExportSVG}>Export Diagram as SVG</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Export Diagram as PNG (coming soon)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>Duplicate Canvas</DropdownMenuItem>
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

      </div>
    </header>
  );
}
