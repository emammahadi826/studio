"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { CanvasHeader } from '@/components/canvas-header';
import { NotepadView } from '@/components/notepad-view';
import { DiagramView } from '@/components/diagram-view';
import { useToast } from '@/hooks/use-toast';
import { generateDiagramAction, suggestConnectionsAction } from '@/lib/actions';
import type { DiagramElement, DiagramConnection } from '@/types';

export type View = 'notepad' | 'diagram';
type Action = 'none' | 'dragging' | 'resizing' | 'creating' | 'marquee';
type ResizingHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';
type AnchorSide = 'top' | 'right' | 'bottom' | 'left';
interface MarqueeRect { x: number; y: number; width: number; height: number; }

function isIntersecting(a: { x: number, y: number, width: number, height: number }, b: { x: number, y: number, width: number, height: number }) {
  return !(b.x > a.x + a.width || b.x + b.width < a.x || b.y > a.y + a.height || b.y + b.height < a.y);
}

export default function Home() {
  const [view, setView] = useState<View>('notepad');
  const [notes, setNotes] = useState<string>('');
  const [elements, setElements] = useState<DiagramElement[]>([]);
  const [connections, setConnections] = useState<DiagramConnection[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  const [action, setAction] = useState<Action>('none');
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [resizingHandle, setResizingHandle] = useState<ResizingHandle | null>(null);
  const [ghostElement, setGhostElement] = useState<DiagramElement | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  
  const initialState = useRef<{
    elements?: DiagramElement[];
    mouseX: number;
    mouseY: number;
    sourceElementId?: string;
    anchorSide?: AnchorSide;
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
  
  const handleDeleteSelected = useCallback(() => {
    if (selectedElementIds.length === 0) return;

    setElements(prev => prev.filter(el => !selectedElementIds.includes(el.id)));
    setConnections(prev => prev.filter(conn => !selectedElementIds.includes(conn.source.elementId) && !selectedElementIds.includes(conn.target.elementId)));
    setSelectedElementIds([]);
    toast({ title: 'Elements Deleted' });
  }, [selectedElementIds, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0) {
            e.preventDefault(); 
            handleDeleteSelected();
        }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElementIds, handleDeleteSelected]);


  const handleAddElement = (type: DiagramElement['type']) => {
    const newElement: DiagramElement = {
      id: `el-${Date.now()}`,
      type,
      content: `New ${type}`,
      x: Math.random() * 300 + 50,
      y: Math.random() * 300 + 50,
      width: type === 'diamond' || type === 'triangle' ? 180 : 150,
      height: type === 'sticky-note' ? 150 : (type === 'diamond' || type === 'triangle' ? 120 : 80),
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
      const elementIdentifiers = elements.map(el => el.content); 
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

  const handleCanvasMouseDown = (e: React.MouseEvent, elementId: string | null, handle?: ResizingHandle | AnchorSide) => {
    const { clientX: mouseX, clientY: mouseY } = e;
    
    if (elementId) {
        const selectedElement = elements.find(el => el.id === elementId);
        if (!selectedElement) return;

        const isResizing = handle && !['top', 'right', 'bottom', 'left'].includes(handle);
        const isCreating = handle && ['top', 'right', 'bottom', 'left'].includes(handle) && !e.altKey;

        if (isCreating) {
            setAction('creating');
            initialState.current = { mouseX, mouseY, sourceElementId: elementId, anchorSide: handle as AnchorSide };
        } else if (isResizing) {
            setAction('resizing');
            setResizingHandle(handle as ResizingHandle);
            setSelectedElementIds([elementId]);
            initialState.current = { elements: JSON.parse(JSON.stringify(elements)), mouseX, mouseY };
        } else { // Dragging
            setAction('dragging');
            let currentSelectedIds = selectedElementIds;
            if (e.shiftKey) {
                currentSelectedIds = selectedElementIds.includes(elementId)
                    ? selectedElementIds.filter(id => id !== elementId)
                    : [...selectedElementIds, elementId];
            } else if (!selectedElementIds.includes(elementId)) {
                currentSelectedIds = [elementId];
            }
            setSelectedElementIds(currentSelectedIds);
            initialState.current = { elements: JSON.parse(JSON.stringify(elements)), mouseX, mouseY };
        }

    } else { // Click on canvas
        setAction('marquee');
        setMarqueeRect({ x: mouseX, y: mouseY, width: 0, height: 0 });
        if (!e.shiftKey) {
            setSelectedElementIds([]);
        }
        initialState.current = { mouseX, mouseY };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (action === 'none') return;
    if (!initialState.current) return;
    
    const { clientX, clientY } = e;
    const dx = clientX - initialState.current.mouseX;
    const dy = clientY - initialState.current.mouseY;

    if (action === 'marquee') {
        const { mouseX, mouseY } = initialState.current;
        const x = Math.min(mouseX, clientX);
        const y = Math.min(mouseY, clientY);
        const width = Math.abs(dx);
        const height = Math.abs(dy);
        const currentMarqueeRect = { x, y, width, height };
        setMarqueeRect(currentMarqueeRect);

        const intersectingIds = elements.filter(el => isIntersecting(el, currentMarqueeRect)).map(el => el.id);
        setSelectedElementIds(ids => {
            const baseIds = e.shiftKey ? ids.filter(id => !intersectingIds.includes(id)) : [];
            return [...new Set([...baseIds, ...intersectingIds])];
        });

    } else if (action === 'creating' && initialState.current.sourceElementId && initialState.current.anchorSide) {
      const { mouseX, mouseY } = initialState.current;
      const newElement: DiagramElement = {
        id: 'ghost', type: 'rectangle', content: '',
        x: clientX > mouseX ? mouseX : clientX,
        y: clientY > mouseY ? mouseY : clientY,
        width: Math.abs(dx), height: Math.abs(dy),
      };
      setGhostElement(newElement);

    } else if (action === 'dragging' && selectedElementIds.length > 0) {
        setElements(
            initialState.current.elements!.map(el =>
                selectedElementIds.includes(el.id)
                    ? { ...el, x: el.x + dx, y: el.y + dy, }
                    : el
            )
        );
    } else if (action === 'resizing' && selectedElementIds.length === 1 && resizingHandle) {
        const elementId = selectedElementIds[0];
        setElements(prevElements =>
            prevElements.map(el => {
                if (el.id === elementId) {
                    const originalElement = initialState.current!.elements!.find(iel => iel.id === elementId)!;
                    let { x, y, width, height } = originalElement;
                    const minSize = 20;

                    if (resizingHandle.includes('bottom')) { width = Math.max(minSize, originalElement.width + dy); }
                    if (resizingHandle.includes('top')) {
                        const newHeight = originalElement.height - dy;
                        height = newHeight > minSize ? newHeight : minSize;
                        y = newHeight > minSize ? originalElement.y + dy : originalElement.y + originalElement.height - minSize;
                    }
                    if (resizingHandle.includes('right')) { width = Math.max(minSize, originalElement.width + dx); }
                    if (resizingHandle.includes('left')) {
                        const newWidth = originalElement.width - dx;
                        width = newWidth > minSize ? newWidth : minSize;
                        x = newWidth > minSize ? originalElement.x + dx : originalElement.x + originalElement.width - minSize;
                    }
                    return { ...el, x, y, width, height };
                }
                return el;
            })
        );
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (action === 'creating' && ghostElement && initialState.current?.sourceElementId) {
        const sourceElementId = initialState.current.sourceElementId;
        const newElementId = `el-${Date.now()}`;
        const finalGhost = { ...ghostElement, id: newElementId, content: 'New rectangle' };
        
        const newConnection: DiagramConnection = {
            id: `conn-${Date.now()}`,
            source: { elementId: sourceElementId },
            target: { elementId: newElementId },
        };

        setElements(prev => [...prev, finalGhost]);
        setConnections(prev => [...prev, newConnection]);
    }
    
    setAction('none');
    setResizingHandle(null);
    setGhostElement(null);
    setMarqueeRect(null);
    initialState.current = null;
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
                ghostElement={ghostElement}
                marqueeRect={marqueeRect}
                onAddElement={handleAddElement}
                onCanvasMouseDown={handleCanvasMouseDown}
                selectedElementIds={selectedElementIds}
            />
          </div>
      </div>
    </main>
  );
}

    
