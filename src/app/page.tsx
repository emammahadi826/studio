"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { CanvasHeader } from '@/components/canvas-header';
import { NotepadView } from '@/components/notepad-view';
import { DiagramView } from '@/components/diagram-view';
import { useToast } from '@/hooks/use-toast';
import { generateDiagramAction, suggestConnectionsAction } from '@/lib/actions';
import type { DiagramElement, DiagramConnection } from '@/types';

export type View = 'notepad' | 'diagram';
type Action = 'none' | 'dragging' | 'resizing';
type ResizingHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';

export default function Home() {
  const [view, setView] = useState<View>('notepad');
  const [notes, setNotes] = useState<string>('');
  const [elements, setElements] = useState<DiagramElement[]>([]);
  const [connections, setConnections] = useState<DiagramConnection[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  const [action, setAction] = useState<Action>('none');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [resizingHandle, setResizingHandle] = useState<ResizingHandle | null>(null);
  
  // Use a ref for initial position to prevent re-renders on move
  const initialDragState = useRef<{
    elementX: number;
    elementY: number;
    elementWidth: number;
    elementHeight: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('canvasnote-notes');
      const savedElements = localStorage.getItem('canvasnote-elements');
      const savedConnections = localStorage.getItem('canvasnote-connections');
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      if (savedElements) setElements(JSON.parse(savedElements));
      if (savedConnections) setConnections(JSON.parse(savedConnections));
    } catch (error) {
      console.error("Failed to load from localStorage", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load saved data." });
    }
    setIsMounted(true);
  }, [toast]);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('canvasnote-notes', JSON.stringify(notes));
      localStorage.setItem('canvasnote-elements', JSON.stringify(elements));
      localStorage.setItem('canvasnote-connections', JSON.stringify(connections));
    } catch (error) {
      console.error("Failed to save to localStorage", error);
    }
  }, [notes, elements, connections, isMounted]);
  
  const handleDeleteElement = useCallback(() => {
    if (!selectedElementId) return;

    setElements(prev => prev.filter(el => el.id !== selectedElementId));
    setConnections(prev => prev.filter(conn => conn.source.elementId !== selectedElementId && conn.target.elementId !== selectedElementId));
    setSelectedElementId(null);
    toast({ title: 'Element Deleted' });
  }, [selectedElementId, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
            e.preventDefault(); // Prevent browser back navigation on backspace
            handleDeleteElement();
        }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElementId, handleDeleteElement]);


  const handleAddElement = (type: DiagramElement['type']) => {
    const newElement: DiagramElement = {
      id: `el-${Date.now()}`,
      type,
      content: `New ${type}`,
      x: Math.random() * 300 + 50,
      y: Math.random() * 300 + 50,
      width: 150,
      height: type === 'sticky-note' ? 150 : 80,
      backgroundColor: type === 'sticky-note' ? '#FFF9C4' : undefined,
    };
    setElements(prev => [...prev, newElement]);
  };
  
  const handleGenerateDiagram = useCallback(async () => {
    toast({ title: 'Generating Diagram...', description: 'AI is analyzing your notes to create a diagram.' });
    try {
      const result = await generateDiagramAction({ notes });
      if (result.elements.length > 0) {
        setElements(result.elements);
        toast({ title: 'Diagram Generated!', description: 'The AI has created a diagram from your notes.' });
      } else {
        toast({ variant: "destructive", title: 'Generation Failed', description: 'Could not generate a diagram. Try rephrasing your notes.' });
      }
    } catch (error) {
      toast({ variant: "destructive", title: 'Error', description: 'An error occurred while generating the diagram.' });
    }
  }, [notes, toast]);

  const handleSuggestConnections = useCallback(async () => {
    toast({ title: 'Suggesting Connections...', description: 'AI is analyzing relationships between elements.' });
    try {
      const elementIdentifiers = elements.map(el => el.content); // Use content for better suggestions
      const result = await suggestConnectionsAction({ notes, diagramElements: elementIdentifiers });
      
      if (result.connections.length > 0) {
        const newConnections: DiagramConnection[] = [];
        result.connections.forEach(conn => {
          const sourceEl = elements.find(el => el.content === conn.source);
          const targetEl = elements.find(el => el.content === conn.target);
          if (sourceEl && targetEl) {
            newConnections.push({
              id: `conn-${Date.now()}-${Math.random()}`,
              source: { elementId: sourceEl.id },
              target: { elementId: targetEl.id }
            });
          }
        });
        setConnections(prev => [...prev, ...newConnections]);
        toast({ title: 'Connections Suggested!', description: 'AI has added connections between elements.' });
      } else {
        toast({ variant: "destructive", title: 'No Connections Found', description: 'The AI could not find any clear connections to suggest.' });
      }
    } catch (error) {
      toast({ variant: "destructive", title: 'Error', description: 'An error occurred while suggesting connections.' });
    }
  }, [notes, elements, toast]);

  const handleExportMarkdown = useCallback(() => {
    const blob = new Blob([notes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas-notes.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Exported!', description: 'Your notes have been downloaded as a Markdown file.' });
  }, [notes, toast]);

  const handleExportSVG = useCallback(() => {
    const svgElement = document.getElementById('diagram-canvas');
    if (!svgElement) {
        toast({ variant: "destructive", title: 'Error', description: 'Could not find the diagram to export.'});
        return;
    }
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);
    const styleEl = `<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;display=swap');</style>`;
    svgString = svgString.replace(/<defs>/, `<defs>${styleEl}`);

    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas-diagram.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Exported!', description: 'Your diagram has been downloaded as an SVG file.' });
  }, [toast]);

  const handleCanvasMouseDown = (e: React.MouseEvent, elementId: string | null, handle?: ResizingHandle) => {
    if (elementId) {
        const selectedElement = elements.find(el => el.id === elementId);
        if (!selectedElement) return;

        setSelectedElementId(elementId);
        initialDragState.current = {
            elementX: selectedElement.x,
            elementY: selectedElement.y,
            elementWidth: selectedElement.width,
            elementHeight: selectedElement.height,
            mouseX: e.clientX,
            mouseY: e.clientY,
        };

        if (handle) {
            setAction('resizing');
            setResizingHandle(handle);
        } else {
            setAction('dragging');
        }
    } else {
        setSelectedElementId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (action === 'none' || !initialDragState.current || !selectedElementId) return;

    const dx = e.clientX - initialDragState.current.mouseX;
    const dy = e.clientY - initialDragState.current.mouseY;

    setElements(prevElements =>
      prevElements.map(el => {
        if (el.id === selectedElementId) {
          if (action === 'dragging') {
            return {
              ...el,
              x: initialDragState.current!.elementX + dx,
              y: initialDragState.current!.elementY + dy,
            };
          } else if (action === 'resizing' && resizingHandle) {
            let { x, y, width, height } = initialDragState.current!;
            const { elementX, elementY, elementWidth, elementHeight } = initialDragState.current!;
            const minSize = 20;

            if (resizingHandle.includes('bottom')) {
              height = Math.max(minSize, elementHeight + dy);
            }
            if (resizingHandle.includes('top')) {
              const newHeight = elementHeight - dy;
              if (newHeight > minSize) {
                y = elementY + dy;
                height = newHeight;
              } else {
                height = minSize;
                y = elementY + elementHeight - minSize;
              }
            }
            if (resizingHandle.includes('right')) {
              width = Math.max(minSize, elementWidth + dx);
            }
            if (resizingHandle.includes('left')) {
              const newWidth = elementWidth - dx;
              if(newWidth > minSize) {
                x = elementX + dx;
                width = newWidth;
              } else {
                width = minSize;
                x = elementX + elementWidth - minSize;
              }
            }
            return { ...el, x, y, width, height };
          }
        }
        return el;
      })
    );
  };

  const handleCanvasMouseUp = () => {
    setAction('none');
    setResizingHandle(null);
    initialDragState.current = null;
    // Don't reset selectedElementId here, so we can show handles on the selected element
  };
  
  return (
    <main className="h-screen w-screen bg-background overflow-hidden flex flex-col" onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}>
      <CanvasHeader
        view={view}
        onViewChange={setView}
        onGenerateDiagram={handleGenerateDiagram}
        onSuggestConnections={handleSuggestConnections}
        onExportMarkdown={handleExportMarkdown}
        onExportSVG={handleExportSVG}
        isDiagramView={view === 'diagram'}
        canSuggestConnections={elements.length >= 2}
        canGenerateDiagram={notes.trim().length > 0}
      />
      <div className="flex-grow pt-[57px] relative">
          <div className={`w-full h-full transition-opacity duration-300 ease-in-out ${view === 'notepad' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <NotepadView content={notes} onContentChange={setNotes} />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${view === 'diagram' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <DiagramView 
                elements={elements} 
                connections={connections} 
                onAddElement={handleAddElement}
                onCanvasMouseDown={handleCanvasMouseDown}
                selectedElementId={selectedElementId}
            />
          </div>
      </div>
    </main>
  );
}
