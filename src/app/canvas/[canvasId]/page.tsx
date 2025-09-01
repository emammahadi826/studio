
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { CanvasHeader } from '@/components/canvas-header';
import { NotepadView } from '@/components/notepad-view';
import { DiagramView } from '@/components/diagram-view';
import { useToast } from '@/hooks/use-toast';
import { generateDiagramAction, suggestConnectionsAction } from '@/lib/actions';
import type { DiagramElement, DiagramConnection, CanvasMetadata } from '@/types';

export type View = 'notepad' | 'diagram';
type Action = 'none' | 'panning' | 'dragging' | 'resizing' | 'creating' | 'creatingShape' | 'marquee' | 'editing' | 'draggingToolbar';
type ResizingHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';
type AnchorSide = 'top' | 'right' | 'bottom' | 'left';
interface MarqueeRect { x: number; y: number; width: number; height: number; }

interface CanvasData {
  notes: string;
  elements: DiagramElement[];
  connections: DiagramConnection[];
  toolbarPosition: { x: number, y: number };
  transform: { scale: number, dx: number, dy: number };
}

function isIntersecting(a: { x: number, y: number, width: number, height: number }, b: { x: number, y: number, width: number, height: number }) {
  return !(b.x > a.x + a.width || b.x + b.width < a.x || b.y > a.y + a.height || b.y + b.height < a.y);
}

export default function CanvasPage() {
  const params = useParams();
  const canvasId = params.canvasId as string;

  const [view, setView] = useState<View>('notepad');
  const [canvasName, setCanvasName] = useState<string>('Untitled Canvas');
  const [notes, setNotes] = useState<string>('');
  const [elements, setElements] = useState<DiagramElement[]>([]);
  const [connections, setConnections] = useState<DiagramConnection[]>([]);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 16, y: 16 });
  const [transform, setTransform] = useState({ scale: 1, dx: 0, dy: 0 });

  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  const [action, setAction] = useState<Action>('none');
  const [activeTool, setActiveTool] = useState<DiagramElement['type'] | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [resizingHandle, setResizingHandle] = useState<ResizingHandle | null>(null);
  const [ghostElement, setGhostElement] = useState<DiagramElement | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  
  const initialState = useRef<{
    elements?: DiagramElement[];
    mouseX: number;
    mouseY: number;
    sourceElementId?: string;
    anchorSide?: AnchorSide;
    toolbarX?: number;
    toolbarY?: number;
    initialTransform?: { scale: number, dx: number, dy: number };
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasId) return;
    setIsMounted(true);
    try {
      // Load canvas metadata
      const allCanvasesStr = localStorage.getItem('canvasnote-all-canvases');
      if (allCanvasesStr) {
        const allCanvases = JSON.parse(allCanvasesStr) as CanvasMetadata[];
        const currentCanvasMeta = allCanvases.find(c => c.id === canvasId);
        if (currentCanvasMeta) {
          setCanvasName(currentCanvasMeta.name);
        }
      }

      // Load canvas data
      const savedDataStr = localStorage.getItem(`canvasnote-data-${canvasId}`);
      if (savedDataStr) {
        const savedData = JSON.parse(savedDataStr) as CanvasData;
        setNotes(savedData.notes);
        setElements(savedData.elements);
        setConnections(savedData.connections);
        if(savedData.toolbarPosition) setToolbarPosition(savedData.toolbarPosition);
        if(savedData.transform) setTransform(savedData.transform);
      } else if (canvasContainerRef.current) {
        setToolbarPosition({ x: 16, y: canvasContainerRef.current.clientHeight / 2 - 150 });
      }

    } catch (error) {
      console.error("Failed to load from localStorage", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load saved canvas data." });
    }
  }, [canvasId, toast]);

  useEffect(() => {
    if (!isMounted || !canvasId) return;
    try {
      const dataToSave: CanvasData = {
        notes,
        elements,
        connections,
        toolbarPosition,
        transform,
      };
      localStorage.setItem(`canvasnote-data-${canvasId}`, JSON.stringify(dataToSave));

      // Update lastModified timestamp in metadata
      const allCanvasesStr = localStorage.getItem('canvasnote-all-canvases');
      if (allCanvasesStr) {
          let allCanvases = JSON.parse(allCanvasesStr) as CanvasMetadata[];
          const canvasIndex = allCanvases.findIndex(c => c.id === canvasId);
          if (canvasIndex !== -1) {
              allCanvases[canvasIndex].lastModified = new Date().toISOString();
              allCanvases[canvasIndex].name = canvasName;
              localStorage.setItem('canvasnote-all-canvases', JSON.stringify(allCanvases));
          }
      }

    } catch (error) {
      console.error("Failed to save to localStorage", error);
    }
  }, [canvasId, canvasName, notes, elements, connections, toolbarPosition, transform, isMounted]);
  
  const handleDeleteSelected = useCallback(() => {
    if (selectedElementIds.length === 0) return;

    setElements(prev => prev.filter(el => !selectedElementIds.includes(el.id)));
    setConnections(prev => prev.filter(conn => !selectedElementIds.includes(conn.source.elementId) && !selectedElementIds.includes(conn.target.elementId)));
    setSelectedElementIds([]);
    toast({ title: 'Elements Deleted', duration: 2000 });
  }, [selectedElementIds, toast]);

  const cancelEditing = useCallback(() => {
    if (editingElementId && textareaRef.current) {
      const newContent = textareaRef.current.value;
      setElements(prev => prev.map(el => el.id === editingElementId ? { ...el, content: newContent } : el));
    }
    setEditingElementId(null);
    setAction('none');
  }, [editingElementId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0 && action !== 'editing') {
            e.preventDefault(); 
            handleDeleteSelected();
        }
        if (e.key === 'Escape') {
          if (action === 'editing') {
            cancelEditing();
          }
          setActiveTool(null);
        }
        if (e.key === 'Enter' && action === 'editing' && !e.shiftKey) {
            e.preventDefault();
            cancelEditing();
        }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElementIds, handleDeleteSelected, action, cancelEditing]);

  useEffect(() => {
    if (action === 'editing' && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
    }
  }, [action, editingElementId]);

  const screenToCanvas = (x: number, y: number) => {
    return {
      x: (x - transform.dx) / transform.scale,
      y: (y - transform.dy) / transform.scale
    };
  };

  const handleToolSelect = (type: DiagramElement['type']) => {
    setActiveTool(type);
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
    a.download = `${canvasName}-notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Exported!', description: 'Your notes have been downloaded as a Markdown file.' });
  }, [notes, canvasName, toast]);

  const handleExportSVG = useCallback(() => {
    const svgElement = document.getElementById('diagram-canvas');
    if (!svgElement) {
        toast({ variant: "destructive", title: 'Error', description: 'Could not find the diagram to export.'});
        return;
    }
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);
    const styleEl = `<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');</style>`;
    svgString = svgString.replace(/<defs>/, `<defs>${styleEl}`);

    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${canvasName}-diagram.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Exported!', description: 'Your diagram has been downloaded as an SVG file.' });
  }, [canvasName, toast]);
  
  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAction('draggingToolbar');
    initialState.current = { 
        mouseX: e.clientX, 
        mouseY: e.clientY,
        toolbarX: toolbarPosition.x,
        toolbarY: toolbarPosition.y,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent, elementId: string | null, handle?: ResizingHandle | AnchorSide) => {
    if (action === 'editing') {
      return;
    }
    const { clientX: mouseX, clientY: mouseY } = e;
    const canvasCoords = screenToCanvas(mouseX, mouseY);

    if (e.button === 1 || e.metaKey || e.ctrlKey) { 
      e.preventDefault();
      setAction('panning');
      initialState.current = { 
        mouseX, 
        mouseY,
        initialTransform: { ...transform } 
      };
      return;
    }
    
    initialState.current = { mouseX, mouseY };

    if (activeTool) {
      setAction('creatingShape');
      setGhostElement({
        id: 'ghost',
        type: activeTool,
        content: '',
        x: canvasCoords.x,
        y: canvasCoords.y,
        width: 0,
        height: 0,
      });
      return;
    }
    
    if (elementId) {
        const selectedElement = elements.find(el => el.id === elementId);
        if (!selectedElement) return;

        const isResizing = handle && !['top', 'right', 'bottom', 'left'].includes(handle);
        const isCreating = handle && ['top', 'right', 'bottom', 'left'].includes(handle) && !e.altKey;

        if (isCreating) {
            setAction('creating');
            initialState.current.sourceElementId = elementId;
            initialState.current.anchorSide = handle as AnchorSide;
        } else if (isResizing) {
            setAction('resizing');
            setResizingHandle(handle as ResizingHandle);
            setSelectedElementIds([elementId]);
            initialState.current.elements = JSON.parse(JSON.stringify(elements));
        } else { 
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
            initialState.current.elements = JSON.parse(JSON.stringify(elements));
        }

    } else { 
        setAction('marquee');
        setMarqueeRect({ x: canvasCoords.x, y: canvasCoords.y, width: 0, height: 0 });
        if (!e.shiftKey) {
            setSelectedElementIds([]);
        }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (action === 'none' || action === 'editing' || !initialState.current) return;
    
    const { clientX, clientY } = e;
    const dx = clientX - initialState.current.mouseX;
    const dy = clientY - initialState.current.mouseY;
    const canvasCoords = screenToCanvas(clientX, clientY);

    if (action === 'draggingToolbar') {
        if (!canvasContainerRef.current || initialState.current.toolbarX === undefined || initialState.current.toolbarY === undefined) return;
        
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const toolbarWidth = 52; 
        const toolbarHeight = 316; 

        let newX = initialState.current.toolbarX + dx;
        let newY = initialState.current.toolbarY + dy;

        newX = Math.max(0, Math.min(newX, containerRect.width - toolbarWidth));
        newY = Math.max(0, Math.min(newY, containerRect.height - toolbarHeight));

        setToolbarPosition({ x: newX, y: newY });
    } else if (action === 'panning' && initialState.current.initialTransform) {
        setTransform(t => ({
          ...t,
          dx: initialState.current!.initialTransform!.dx + dx,
          dy: initialState.current!.initialTransform!.dy + dy,
        }));
    } else if (action === 'marquee' && marqueeRect) {
        if (!initialState.current) return;
        const startCoords = screenToCanvas(initialState.current.mouseX, initialState.current.mouseY);
        const x = Math.min(startCoords.x, canvasCoords.x);
        const y = Math.min(startCoords.y, canvasCoords.y);
        const width = Math.abs(canvasCoords.x - startCoords.x);
        const height = Math.abs(canvasCoords.y - startCoords.y);
        const currentMarqueeRect = { x, y, width, height };
        setMarqueeRect(currentMarqueeRect);

        const intersectingIds = elements.filter(el => isIntersecting(el, currentMarqueeRect)).map(el => el.id);
        setSelectedElementIds(ids => {
            const baseIds = e.shiftKey ? ids.filter(id => !intersectingIds.includes(id)) : [];
            return [...new Set([...baseIds, ...intersectingIds])];
        });

    } else if (action === 'creatingShape' && activeTool && ghostElement) {
        if (!initialState.current) return;
        const startCoords = screenToCanvas(initialState.current.mouseX, initialState.current.mouseY);
        const newElement: DiagramElement = {
            ...ghostElement,
            x: Math.min(startCoords.x, canvasCoords.x),
            y: Math.min(startCoords.y, canvasCoords.y),
            width: Math.abs(canvasCoords.x - startCoords.x), 
            height: Math.abs(canvasCoords.y - startCoords.y),
        };
        setGhostElement(newElement);

    } else if (action === 'creating' && initialState.current.sourceElementId && ghostElement) {
      if (!initialState.current) return;
      const startCoords = screenToCanvas(initialState.current.mouseX, initialState.current.mouseY);
      const newElement: DiagramElement = {
        ...ghostElement,
        x: Math.min(startCoords.x, canvasCoords.x),
        y: Math.min(startCoords.y, canvasCoords.y),
        width: Math.abs(canvasCoords.x - startCoords.x), 
        height: Math.abs(canvasCoords.y - startCoords.y),
      };
      setGhostElement(newElement);

    } else if (action === 'dragging' && selectedElementIds.length > 0 && initialState.current.elements) {
        setElements(
            initialState.current.elements!.map(el =>
                selectedElementIds.includes(el.id)
                    ? { ...el, x: el.x + dx / transform.scale, y: el.y + dy / transform.scale, }
                    : el
            )
        );
    } else if (action === 'resizing' && selectedElementIds.length === 1 && resizingHandle && initialState.current.elements) {
        const elementId = selectedElementIds[0];
        setElements(prevElements =>
            prevElements.map(el => {
                if (el.id === elementId) {
                    const originalElement = initialState.current!.elements!.find(iel => iel.id === elementId)!;
                    let { x, y, width, height } = originalElement;
                    const minSize = 20;

                    if (resizingHandle.includes('bottom')) { height = Math.max(minSize, originalElement.height + dy / transform.scale); }
                    if (resizingHandle.includes('top')) {
                        const newHeight = originalElement.height - dy / transform.scale;
                        height = newHeight > minSize ? newHeight : minSize;
                        y = newHeight > minSize ? originalElement.y + dy / transform.scale : originalElement.y + originalElement.height - minSize;
                    }
                    if (resizingHandle.includes('right')) { width = Math.max(minSize, originalElement.width + dx / transform.scale); }
                    if (resizingHandle.includes('left')) {
                        const newWidth = originalElement.width - dx / transform.scale;
                        width = newWidth > minSize ? newWidth : minSize;
                        x = newWidth > minSize ? originalElement.x + dx / transform.scale : originalElement.x + originalElement.width - minSize;
                    }
                    return { ...el, x, y, width, height };
                }
                return el;
            })
        );
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
        if (action === 'panning') {
            setAction('none');
            initialState.current = null;
        }
        return;
    }
    
    if (action === 'creatingShape' && ghostElement && activeTool) {
      if (ghostElement.width > 5 && ghostElement.height > 5) {
        const newElement: DiagramElement = {
          ...ghostElement,
          id: `el-${Date.now()}`,
          content: `New ${activeTool}`,
          backgroundColor: activeTool === 'sticky-note' ? '#FFF9C4' : undefined,
        };
        setElements(prev => [...prev, newElement]);
        setSelectedElementIds([newElement.id]);
        setEditingElementId(newElement.id);
        setAction('editing');
      } else {
        setAction('none');
      }
      setActiveTool(null);
    }
    else if (action === 'creating' && ghostElement && initialState.current?.sourceElementId) {
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
        setAction('none');
    } else {
        setAction('none');
    }
    
    if (action !== 'editing') {
      setResizingHandle(null);
      setGhostElement(null);
      setMarqueeRect(null);
      initialState.current = null;
    }
  };

  const handleElementDoubleClick = (elementId: string) => {
    cancelEditing(); 
    setAction('editing');
    setEditingElementId(elementId);
    setSelectedElementIds([elementId]);
  };
  
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (action === 'editing' && e.target instanceof SVGElement && e.target.id === 'diagram-canvas') {
        cancelEditing();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setElements(prev => prev.map(el => el.id === editingElementId ? { ...el, content: newContent } : el));
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.shiftKey) { // Pinch-to-zoom on trackpads OR Ctrl+Scroll
        const { clientX, clientY, deltaY } = e;
        const zoomFactor = 0.0005;
        
        setTransform(prevTransform => {
            const newScale = Math.max(0.1, Math.min(5, prevTransform.scale * (1 - deltaY * zoomFactor)));
        
            const containerRect = canvasContainerRef.current?.getBoundingClientRect();
            if (!containerRect) return prevTransform;
        
            const mouseX = clientX - containerRect.left;
            const mouseY = clientY - containerRect.top;
            
            // Pan to keep the mouse position consistent relative to the canvas content
            const newDx = mouseX - (mouseX - prevTransform.dx) * (newScale / prevTransform.scale);
            const newDy = mouseY - (mouseY - prevTransform.dy) * (newScale / prevTransform.scale);
        
            return { scale: newScale, dx: newDx, dy: newDy };
        });
    } else { // Pan with mouse wheel or two-finger swipe on trackpad
        const { deltaX, deltaY } = e;
        setTransform(prevTransform => ({
            ...prevTransform,
            dx: prevTransform.dx - deltaX,
            dy: prevTransform.dy - deltaY,
        }));
    }
  };


  const paddingTop = '57px';
  
  return (
    <main className="h-screen w-screen bg-background overflow-hidden flex flex-col">
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
        canvasName={canvasName}
        onCanvasNameChange={setCanvasName}
      />
      <div 
        className="flex-grow relative"
        style={{ paddingTop }}
        ref={canvasContainerRef}
      >
          <div className={`w-full h-full transition-opacity duration-300 ease-in-out ${view === 'notepad' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <NotepadView content={notes} onContentChange={setNotes} />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${view === 'diagram' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ top: paddingTop }}
            onMouseMove={handleCanvasMouseMove} 
            onMouseUp={handleCanvasMouseUp} 
            onMouseLeave={handleCanvasMouseUp}
            onClick={handleCanvasClick}
            onWheel={handleWheel}
          >
            <div 
              className="w-full h-full"
              style={{ cursor: activeTool ? 'crosshair' : (action === 'panning' ? 'grabbing' : 'default') }}
            >
              <DiagramView 
                  elements={elements} 
                  connections={connections} 
                  ghostElement={ghostElement}
                  marqueeRect={marqueeRect}
                  onToolSelect={handleToolSelect}
                  onCanvasMouseDown={handleCanvasMouseDown}
                  selectedElementIds={selectedElementIds}
                  activeTool={activeTool}
                  editingElementId={editingElementId}
                  onElementDoubleClick={handleElementDoubleClick}
                  toolbarPosition={toolbarPosition}
                  onToolbarMouseDown={handleToolbarMouseDown}
                  transform={transform}
              />
            </div>
             {action === 'editing' && editingElementId && (
                (() => {
                    const el = elements.find(e => e.id === editingElementId);
                    if (!el) return null;
                    
                    const left = transform.dx + el.x * transform.scale;
                    const top = transform.dy + el.y * transform.scale;
                    const width = el.width * transform.scale;
                    const height = el.height * transform.scale;
                    
                    return (
                        <textarea
                            ref={textareaRef}
                            value={el.content}
                            onChange={handleTextareaChange}
                            onBlur={cancelEditing}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    cancelEditing();
                                }
                                if (e.key === 'Escape') {
                                    cancelEditing();
                                }
                            }}
                            style={{
                                position: 'absolute',
                                left: left,
                                top: top,
                                width: width,
                                height: height,
                                background: 'transparent',
                                border: '2px solid hsl(var(--primary))',
                                color: 'hsl(var(--foreground))',
                                resize: 'none',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: `${8 * transform.scale}px`,
                                boxSizing: 'border-box',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: `${14 * transform.scale}px`,
                                zIndex: 100,
                            }}
                        />
                    );
                })()
            )}
          </div>
      </div>
    </main>
  );
}
