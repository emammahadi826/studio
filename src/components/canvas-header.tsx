
"use client";

import { BrainCircuit, Download, SquarePen, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from './ui/sidebar';
import { Input } from './ui/input';

export type View = 'notepad' | 'diagram';

interface CanvasHeaderProps {
  view: View;
  onViewChange: (view: View) => void;
  onGenerateDiagram: () => void;
  onSuggestConnections: () => void;
  onExportMarkdown: () => void;
  onExportSVG: () => void;
  isDiagramView: boolean;
  canSuggestConnections: boolean;
  canGenerateDiagram: boolean;
  canvasName: string;
  onCanvasNameChange: (name: string) => void;
}

export function CanvasHeader({
  view,
  onViewChange,
  onGenerateDiagram,
  onSuggestConnections,
  onExportMarkdown,
  onExportSVG,
  isDiagramView,
  canSuggestConnections,
  canGenerateDiagram,
  canvasName,
  onCanvasNameChange,
}: CanvasHeaderProps) {
  const { state, isMobile } = useSidebar();
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
              <BrainCircuit className="w-4 h-4 mr-2" />
              AI Tools
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={!isDiagramView || !canGenerateDiagram ? 'cursor-not-allowed' : ''}>
                    <DropdownMenuItem 
                      onClick={onGenerateDiagram} 
                      disabled={!isDiagramView || !canGenerateDiagram}
                    >
                      Generate Diagram from Notes
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                {!isDiagramView && <TooltipContent><p>Switch to Diagram view to use this feature.</p></TooltipContent>}
                {isDiagramView && !canGenerateDiagram && <TooltipContent><p>Write some notes first.</p></TooltipContent>}
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
               <Tooltip>
                <TooltipTrigger asChild>
                  <div className={!isDiagramView || !canSuggestConnections ? 'cursor-not-allowed' : ''}>
                    <DropdownMenuItem 
                      onClick={onSuggestConnections}
                      disabled={!isDiagramView || !canSuggestConnections}
                    >
                      Suggest Connections
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                {!isDiagramView && <TooltipContent><p>Switch to Diagram view to use this feature.</p></TooltipContent>}
                {isDiagramView && !canSuggestConnections && <TooltipContent><p>Add at least two elements to the diagram.</p></TooltipContent>}
              </Tooltip>
            </TooltipProvider>

          </DropdownMenuContent>
        </DropdownMenu>

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
      </div>
    </header>
  );
}
