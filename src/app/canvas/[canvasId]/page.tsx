
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CanvasHeader } from '@/components/canvas-header';
import { NotepadView } from '@/components/notepad-view';
import { DiagramView } from '@/components/diagram-view';
import { useToast } from '@/hooks/use-toast';
import { generateDiagramAction, suggestConnectionsAction } from '@/lib/actions';
import type { DiagramElement, DiagramConnection, CanvasMetadata, CanvasData } from '@/types';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, deleteDoc, collection, addDoc, Timestamp } from 'firebase/firestore';


export type View = 'notepad' | 'diagram';
type Action = 'none' | 'panning' | 'dragging' | 'resizing' | 'creating' | 'creatingShape' | 'marquee' | 'editing' | 'draggingToolbar' | 'drawing';
type ResizingHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';
type AnchorSide = 'top' | 'right' | 'bottom' | 'left';
interface MarqueeRect { x: number; y: number; width: number; height: number; }

function getBoundsForDrawing(points: {x: number, y: number}[]) {
    if (!points || points.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function isIntersecting(a: { x: number, y: number, width: number, height: number }, b: { x: number, y: number, width: number, height: number }) {
  const aBounds = 'points' in a ? getBoundsForDrawing((a as any).points) : a;
  return !(b.x > aBounds.x + aBounds.width || b.x + b.width < aBounds.x || b.y > aBounds.y + aBounds.height || b.y + b.height < aBounds.y);
}


export default function CanvasPage() {
  const params = useParams();
  const canvasId = Array.isArray(params.canvasId) ? params.canvasId[0] : params.canvasId;
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [view, setView] = useState<View>('notepad');
  
  // State for all canvas data
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);

  // Derived state for easier access
  const canvasName = canvasData?.name || 'Untitled Canvas';
  const notes = canvasData?.notes || '';
  const elements = canvasData?.elements || [];
  const connections = canvasData?.connections || [];
  const toolbarPosition = canvasData?.toolbarPosition || { x: 16, y: 16 };
  const transform = canvasData?.transform || { scale: 1, dx: 0, dy: 0 };
  
  const [isMounted, setIsMounted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(canvasName);

  const [action, setAction] = useState<Action>('none');
  const [activeTool, setActiveTool] = useState<DiagramElement['type'] | 'pen' | 'pan' | null>(null);
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
    currentPath?: { id: string, points: { x: number, y: number }[] };
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  // --- Data handling Effects ---
  
  // Real-time listener for canvas data
  useEffect(() => {
    if (!user || !canvasId) return;

    const docRef = doc(db, "users", user.uid, "canvases", canvasId);
    const unsubscribe = onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data() as Omit<CanvasData, 'id'>;
            setCanvasData(data);
            if (!isEditingName) {
              setEditingNameValue(data.name);
            }
        } else {
            if (!canvasData) {
              console.error("Canvas not found or permissions issue.");
              toast({ variant: "destructive", title: "Error", description: "This canvas does not exist or you don't have permission to view it." });
              router.push('/');
            }
        }
    }, (error) => {
        console.error("Error listening to canvas changes:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not connect to the canvas." });
    });

    return () => unsubscribe();
  }, [canvasId, user, router, toast, isEditingName]);

  
  // Debounced save effect
  const saveCanvas = useCallback(async (dataToSave: CanvasData) => {
    if (!user || !canvasId) return;

    // Create a deep copy to avoid mutating the state directly
    const cleanData = JSON.parse(JSON.stringify(dataToSave));

    // Sanitize elements to remove any undefined `backgroundColor` fields
    if (cleanData.elements) {
      cleanData.elements = cleanData.elements.map((el: DiagramElement) => {
        if (el.backgroundColor === undefined) {
          delete el.backgroundColor;
        }
        return el;
      });
    }


    try {
      const docRef = doc(db, "users", user.uid, "canvases", canvasId);
      await setDoc(docRef, {
        ...cleanData,
        lastModified: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Failed to save to Firestore", error);
    }
  }, [user, canvasId]);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (canvasData) { 
      saveTimeoutRef.current = setTimeout(() => {
        saveCanvas(canvasData);
      }, 500); // 500ms debounce
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [canvasData, saveCanvas]);


  const updateCanvasData = useCallback((updates: Partial<CanvasData>) => {
    setCanvasData(prev => {
        if (!prev) return null;
        return { ...prev, ...updates };
    });
  }, []);
  
  const handleCanvasNameChange = (name: string) => {
    updateCanvasData({ name });
    setIsEditingName(false);
  };
  const handleNotesChange = (notes: string) => updateCanvasData({ notes });
  const handleElementsChange = useCallback((updater: (prev: DiagramElement[]) => DiagramElement[]) => {
      updateCanvasData({ elements: updater(elements) });
  }, [elements, updateCanvasData]);
  const handleConnectionsChange = useCallback((updater: (prev: DiagramConnection[]) => DiagramConnection[]) => {
      updateCanvasData({ connections: updater(connections) });
  }, [connections, updateCanvasData]);
  const handleToolbarPositionChange = (position: { x: number, y: number }) => updateCanvasData({ toolbarPosition: position });
  const handleTransformChange = (updater: (prev: { scale: number, dx: number, dy: number }) => { scale: number, dx: number, dy: number }) => {
      updateCanvasData({ transform: updater(transform) });
  };


  useEffect(() => {
    setIsMounted(true);
  }, []);

  
  // --- Action Handlers ---

  const handleCreateNewCanvas = useCallback(async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    try {
      const newCanvasData: Omit<CanvasData, 'createdAt' | 'lastModified'> = {
        name: 'Untitled Canvas',
        notes: '',
        elements: [],
        connections: [],
        toolbarPosition: { x: 16, y: 100 },
        transform: { scale: 1, dx: 0, dy: 0 },
        userId: user.uid,
      };

      const docRef = await addDoc(collection(db, "users", user.uid, "canvases"), {
        ...newCanvasData,
        createdAt: serverTimestamp(),
        lastModified: serverTimestamp(),
      });
      
      const newCanvasWithTimestamps: CanvasData = {
          ...newCanvasData,
          createdAt: Timestamp.now(),
          lastModified: Timestamp.now(),
      };
      
      setCanvasData(newCanvasWithTimestamps);
      router.push(`/canvas/${docRef.id}`);

    } catch (error) {
      console.error("Failed to create new canvas in Firestore", error);
      toast({ variant: "destructive", title: "Error", description: "Could not create a new canvas." });
    }
  }, [user, router, toast]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedElementIds.length === 0) return;

    handleElementsChange(prev => prev.filter(el => !selectedElementIds.includes(el.id)));
    handleConnectionsChange(prev => prev.filter(conn => !selectedElementIds.includes(conn.source.elementId) && !selectedElementIds.includes(conn.target.elementId)));
    setSelectedElementIds([]);
    toast({ title: 'Elements Deleted', duration: 2000 });
  }, [selectedElementIds, toast, handleElementsChange, handleConnectionsChange]);

  const handleDeleteCanvas = useCallback(async () => {
    if (!canvasId || !user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "canvases", canvasId));
      toast({ title: 'Canvas Deleted', description: 'The canvas has been successfully deleted.' });
      router.push('/');
    } catch (error) {
      console.error("Failed to delete canvas from Firestore", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete canvas." });
    }
  }, [canvasId, user, toast, router]);

  const cancelEditing = useCallback(() => {
    if (editingElementId && textareaRef.current) {
      const newContent = textareaRef.current.value;
      handleElementsChange(prev => prev.map(el => el.id === editingElementId ? { ...el, content: newContent } : el));
    }
    setEditingElementId(null);
    setAction('none');
  }, [editingElementId, handleElementsChange]);

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

  const handleToolSelect = (type: DiagramElement['type'] | 'pen' | 'pan' | null) => {
    setActiveTool(type);
  };
  
  const handleGenerateDiagram = useCallback(async () => {
    toast({ title: 'Generating Diagram...', description: 'AI is analyzing your notes to create a diagram.' });
    try {
      const result = await generateDiagramAction({ notes });
      if (result.elements.length > 0) {
        handleElementsChange(() => result.elements);
        toast({ title: 'Diagram Generated!', description: 'The AI has created a diagram from your notes.' });
      } else {
        toast({ variant: "destructive", title: 'Generation Failed', description: 'Could not generate a diagram. Try rephrasing your notes.' });
      }
    } catch (error) {
      toast({ variant: "destructive", title: 'Error', description: 'An error occurred while generating the diagram.' });
    }
  }, [notes, toast, handleElementsChange]);

  const handleSuggestConnections = useCallback(async () => {
    toast({ title: 'Suggesting Connections...', description: 'AI is analyzing relationships between elements.' });
    try {
      const elementIdentifiers = elements.map(el => el.content).filter(Boolean); 
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
        handleConnectionsChange(prev => [...prev, ...newConnections]);
        toast({ title: 'Connections Suggested!', description: 'AI has added connections between elements.' });
      } else {
        toast({ variant: "destructive", title: 'No Connections Found', description: 'The AI could not find any clear connections to suggest.' });
      }
    } catch (error) {
      toast({ variant: "destructive", title: 'Error', description: 'An error occurred while suggesting connections.' });
    }
  }, [notes, elements, toast, handleConnectionsChange]);

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

    if (e.button === 1 || e.metaKey || e.ctrlKey || activeTool === 'pan') { 
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

    if (activeTool === 'pen') {
      setAction('drawing');
      const newPath = { id: `el-${Date.now()}`, points: [canvasCoords] };
      initialState.current.currentPath = newPath;
      const newDrawingElement: DiagramElement = {
        id: newPath.id,
        type: 'drawing',
        points: newPath.points,
        x: 0, y: 0, width: 0, height: 0, // These will be calculated later
        content: '',
      };
      handleElementsChange(prev => [...prev, newDrawingElement]);
      return;
    } else if (activeTool) {
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

    if (action === 'drawing' && initialState.current.currentPath) {
      const { id, points } = initialState.current.currentPath;
      const newPoints = [...points, canvasCoords];
      initialState.current.currentPath.points = newPoints;
      handleElementsChange(prev => prev.map(el => el.id === id ? { ...el, type: 'drawing', points: newPoints } : el));

    } else if (action === 'draggingToolbar') {
        if (!canvasContainerRef.current || initialState.current.toolbarX === undefined || initialState.current.toolbarY === undefined) return;
        
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const toolbarWidth = 52; 
        const toolbarHeight = 316; 

        let newX = initialState.current.toolbarX + dx;
        let newY = initialState.current.toolbarY + dy;

        newX = Math.max(0, Math.min(newX, containerRect.width - toolbarWidth));
        newY = Math.max(0, Math.min(newY, containerRect.height - toolbarHeight));

        handleToolbarPositionChange({ x: newX, y: newY });
    } else if (action === 'panning' && initialState.current.initialTransform) {
        handleTransformChange(t => ({
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
            const newIds = e.shiftKey ? [...intersectingIds, ...ids.filter(id => intersectingIds.includes(id))] : intersectingIds;
            return [...new Set([...baseIds, ...newIds])];
        });

    } else if (action === 'creatingShape' && activeTool && ghostElement && activeTool !== 'pen' && activeTool !== 'pan') {
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
        handleElementsChange(() => 
            initialState.current!.elements!.map(el => {
                if (selectedElementIds.includes(el.id)) {
                    if (el.type === 'drawing') {
                        const newPoints = el.points.map(p => ({
                            x: p.x + dx / transform.scale,
                            y: p.y + dy / transform.scale,
                        }));
                        const bounds = getBoundsForDrawing(newPoints);
                        return { ...el, type: 'drawing', points: newPoints, ...bounds };
                    }
                    return { ...el, x: el.x + dx / transform.scale, y: el.y + dy / transform.scale };
                }
                return el;
            })
        );
    } else if (action === 'resizing' && selectedElementIds.length === 1 && resizingHandle && initialState.current.elements) {
        const elementId = selectedElementIds[0];
        handleElementsChange(prevElements =>
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
    if (action === 'drawing' && initialState.current?.currentPath) {
        const { id, points } = initialState.current.currentPath;
        if (points.length > 1) {
            handleElementsChange(prev => prev.map(el => 
                el.id === id ? { ...el, ...getBoundsForDrawing(points) } : el
            ));
        } else {
            // If it's just a click, remove the temporary drawing element
            handleElementsChange(prev => prev.filter(el => el.id !== id));
        }
        setAction('none');
    }
    else if (action === 'creatingShape' && activeTool && activeTool !== 'pen' && activeTool !== 'pan') {
      // If the user didn't drag to create a shape, create a default-sized one
      if (ghostElement && ghostElement.width < 5 && ghostElement.height < 5) {
          const defaultWidth = 150;
          const defaultHeight = activeTool === 'sticky-note' ? 150 : (activeTool === 'text' ? 40 : 80);
          const newElement: DiagramElement = {
              ...ghostElement,
              id: `el-${Date.now()}`,
              content: `New ${activeTool}`,
              width: defaultWidth,
              height: defaultHeight,
              x: ghostElement.x - defaultWidth / 2, // Center it on the cursor
              y: ghostElement.y - defaultHeight / 2,
              backgroundColor: activeTool === 'sticky-note' ? '#FFF9C4' : undefined,
          };
          handleElementsChange(prev => [...prev, newElement]);
          setSelectedElementIds([newElement.id]);
          setEditingElementId(newElement.id);
          setAction('editing');
      } 
      // If they did drag, create the shape with the dragged dimensions
      else if (ghostElement) {
        const newElement: DiagramElement = {
          ...ghostElement,
          id: `el-${Date.now()}`,
          content: `New ${activeTool}`,
          backgroundColor: activeTool === 'sticky-note' ? '#FFF9C4' : undefined,
        };
        handleElementsChange(prev => [...prev, newElement]);
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

        handleElementsChange(prev => [...prev, finalGhost]);
        handleConnectionsChange(prev => [...prev, newConnection]);
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
    const el = elements.find(e => e.id === elementId);
    if (el?.type === 'drawing') return;
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
    handleElementsChange(prev => prev.map(el => el.id === editingElementId ? { ...el, content: newContent } : el));
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.shiftKey) { // Pinch-to-zoom on trackpads OR Ctrl+Scroll
        const { clientX, clientY, deltaY } = e;
        const zoomFactor = 0.0005;
        
        handleTransformChange(prevTransform => {
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
    } else { // Pan with mouse wheel or two-finger swipe on trackpads
        const { deltaX, deltaY } = e;
        handleTransformChange(prevTransform => ({
            ...prevTransform,
            dx: prevTransform.dx - deltaX,
            dy: prevTransform.dy - deltaY,
        }));
    }
  };

  const getCursor = () => {
    if (activeTool === 'pan' || action === 'panning') return 'grabbing';
    if (activeTool) return 'crosshair';
    return 'default';
  }

  const paddingTop = '57px';
  
  if (loading || !isMounted || !canvasData) {
      return (
        <div className="flex items-center justify-center h-screen">
          <p>Loading Canvas...</p>
        </div>
      )
  }

  return (
    <main className="h-screen w-screen bg-background overflow-hidden flex flex-col">
      <CanvasHeader
        view={view}
        onViewChange={setView}
        onExportMarkdown={handleExportMarkdown}
        onExportSVG={handleExportSVG}
        onDelete={handleDeleteCanvas}
        canvasName={canvasName}
        onCanvasNameChange={handleCanvasNameChange}
        onCreateNew={handleCreateNewCanvas}
        isEditingName={isEditingName}
        onToggleEditName={setIsEditingName}
        editingNameValue={editingNameValue}
        onEditingNameChange={setEditingNameValue}
      />
      <div 
        className="flex-grow relative"
        style={{ paddingTop }}
        ref={canvasContainerRef}
      >
          <div className={`w-full h-full transition-opacity duration-300 ease-in-out ${view === 'notepad' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <NotepadView content={notes} onContentChange={handleNotesChange} />
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
              style={{ cursor: getCursor() }}
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
