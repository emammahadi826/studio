
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
import { Separator } from '@/components/ui/separator';


export type View = 'document' | 'canvas' | 'both';
type Action = 'none' | 'panning' | 'dragging' | 'resizing' | 'creating' | 'creatingShape' | 'marquee' | 'editing' | 'draggingToolbar' | 'drawing';
type ResizingHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';
type AnchorSide = 'top' | 'right' | 'bottom' | 'left';
interface MarqueeRect { x: number; y: number; width: number; height: number; }
interface HistoryEntry {
  elements: DiagramElement[];
  connections: DiagramConnection[];
}


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

function isIntersecting(a: DiagramElement, b: { x: number, y: number, width: number, height: number }) {
  const aBounds = a.type === 'drawing' && a.points ? getBoundsForDrawing(a.points) : a;
  return !(b.x > aBounds.x + aBounds.width || b.x + b.width < aBounds.x || b.y > aBounds.y + aBounds.height || b.y + b.height < aBounds.y);
}


export default function CanvasPage() {
  const params = useParams();
  const canvasId = Array.isArray(params.canvasId) ? params.canvasId[0] : params.canvasId;
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [view, setView] = useState<View>('both');
  
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
  const [isEditingName, setIsEditingName] = useState(isMounted);
  const [editingNameValue, setEditingNameValue] = useState(canvasName);

  const [action, setAction] = useState<Action>('none');
  const [activeTool, setActiveTool] = useState<DiagramElement['type'] | 'pen' | 'pan' | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [resizingHandle, setResizingHandle] = useState<ResizingHandle | null>(null);
  const [ghostElement, setGhostElement] = useState<DiagramElement | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDirty, setIsDirty] = useState(false);


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
    initialSelectedIds?: string[];
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // --- Data handling Effects ---
  
  // Real-time listener for canvas data
  useEffect(() => {
    if (!user || !canvasId) return;

    const docRef = doc(db, "users", user.uid, "canvases", canvasId);
    const unsubscribe = onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data() as Omit<CanvasData, 'id'>;
            
            setCanvasData(prevData => {
              // Only update from firestore if not dirty, to prevent overwriting local changes
              if (isDirty && prevData) {
                  return prevData;
              }
              const serverData = data;
              if (historyIndex === -1 && serverData.elements && serverData.connections) {
                  setHistory([{ elements: serverData.elements, connections: serverData.connections }]);
                  setHistoryIndex(0);
              }
               if (!isEditingName) {
                setEditingNameValue(serverData.name);
              }
              return serverData;
            });
            
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId, user, router, toast, isDirty, isEditingName]);

  
  const saveCanvas = useCallback(async () => {
    if (!user || !canvasId || !canvasData || !isDirty) return;

    const dataToSave = { ...canvasData };
    
    // Sanitize elements
    if (dataToSave.elements) {
      dataToSave.elements = dataToSave.elements.map((el: DiagramElement) => {
        const cleanEl = { ...el };
        if (cleanEl.backgroundColor === undefined) {
          delete (cleanEl as any).backgroundColor;
        }
        return cleanEl;
      });
    }

    try {
      const docRef = doc(db, "users", user.uid, "canvases", canvasId);
      await setDoc(docRef, {
        ...dataToSave,
        lastModified: serverTimestamp(),
      }, { merge: true });
      setIsDirty(false); // Reset dirty state after successful save
    } catch (error) {
      console.error("Failed to save to Firestore", error);
    }
  }, [user, canvasId, canvasData, isDirty]);

  // Periodic save effect
  useEffect(() => {
    const interval = setInterval(() => {
      saveCanvas();
    }, 5000); // Check for changes every 5 seconds

    return () => clearInterval(interval);
  }, [saveCanvas]);


  const updateCanvasData = useCallback((updater: (prev: CanvasData) => Partial<CanvasData>, addToHistory = false) => {
      setCanvasData(prev => {
          if (!prev) return null;
          const updates = updater(prev);
          const newState = { ...prev, ...updates };

          if (addToHistory && (updates.elements || updates.connections)) {
              const newEntry: HistoryEntry = {
                  elements: newState.elements,
                  connections: newState.connections,
              };
              // If we are undoing/redoing, we slice the history
              const newHistory = history.slice(0, historyIndex + 1);
              newHistory.push(newEntry);
              setHistory(newHistory);
              setHistoryIndex(newHistory.length - 1);
          }
          
          setIsDirty(true);
          return newState;
      });
    }, [history, historyIndex]);
  
  const handleCanvasNameChange = (name: string) => {
    setCanvasData(prev => prev ? ({...prev, name}) : null);
    setIsDirty(true);
    setIsEditingName(false);
  };
  const handleNotesChange = (newNotes: string) => {
    setCanvasData(prev => prev ? ({...prev, notes: newNotes}) : null);
    setIsDirty(true);
  };
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  
  // --- Action Handlers ---

   const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevState = history[newIndex];
      setCanvasData(prev => prev ? { ...prev, ...prevState } : null);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextState = history[newIndex];
      setCanvasData(prev => prev ? { ...prev, ...nextState } : null);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

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
      
      router.push(`/canvas/${docRef.id}`);

    } catch (error) {
      console.error("Failed to create new canvas in Firestore", error);
      toast({ variant: "destructive", title: "Error", description: "Could not create a new canvas." });
    }
  }, [user, router, toast]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedElementIds.length === 0 || !canvasData) return;
    updateCanvasData(prev => ({
        elements: prev.elements.filter(el => !selectedElementIds.includes(el.id)),
        connections: prev.connections.filter(conn => !selectedElementIds.includes(conn.source.elementId) && !selectedElementIds.includes(conn.target.elementId)),
    }), true);

    setSelectedElementIds([]);
    toast({ title: 'Elements Deleted', duration: 2000 });
  }, [selectedElementIds, canvasData, toast, updateCanvasData]);

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

  const cancelEditing = useCallback((finalContent?: string) => {
    if (editingElementId) {
        updateCanvasData(prev => ({
            elements: prev.elements.map(el => {
                if (el.id === editingElementId && 'content' in el) {
                    return { ...el, content: finalContent ?? el.content };
                }
                return el;
            })
        }), true);
    }
    setEditingElementId(null);
    setAction('none');
  }, [editingElementId, updateCanvasData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0 && action !== 'editing') {
            e.preventDefault(); 
            handleDeleteSelected();
        }
        if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleUndo();
        }
        if (e.key === 'y' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleRedo();
        }
        if (e.key === 'Escape') {
          if (action === 'editing') {
            cancelEditing();
          } else {
             setAction('none');
             setActiveTool(null);
             setGhostElement(null);
             setMarqueeRect(null);
             setSelectedElementIds([]);
          }
        }
        if (e.key === 'Enter' && action === 'editing' && !e.shiftKey) {
            e.preventDefault();
            cancelEditing((e.target as HTMLTextAreaElement).value);
        }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElementIds, handleDeleteSelected, action, cancelEditing, handleUndo, handleRedo]);

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
    setSelectedElementIds([]);
  };
  
  const handleGenerateDiagram = useCallback(async () => {
    toast({ title: 'Generating Diagram...', description: 'AI is analyzing your notes to create a diagram.' });
    try {
      const result = await generateDiagramAction({ notes });
      if (result.elements.length > 0) {
        updateCanvasData(() => ({ elements: result.elements }), true);
        toast({ title: 'Diagram Generated!', description: 'The AI has created a diagram from your notes.' });
      } else {
        toast({ variant: "destructive", title: 'Generation Failed', description: 'Could not generate a diagram. Try rephrasing your notes.' });
      }
    } catch (error) {
      toast({ variant: "destructive", title: 'Error', description: 'An error occurred while generating the diagram.' });
    }
  }, [notes, toast, updateCanvasData]);

  const handleSuggestConnections = useCallback(async () => {
    if (!canvasData) return;
    toast({ title: 'Suggesting Connections...', description: 'AI is analyzing relationships between elements.' });
    try {
      const elementIdentifiers = canvasData.elements.map(el => `element-id-${el.id}`).filter(Boolean) as string[]; 
      const result = await suggestConnectionsAction({ notes: canvasData.notes, diagramElements: elementIdentifiers });
      
      if (result.connections.length > 0) {
        const newConnections: DiagramConnection[] = [];
        result.connections.forEach(conn => {
          const sourceEl = canvasData.elements.find(el => `element-id-${el.id}` === conn.source);
          const targetEl = canvasData.elements.find(el => `element-id-${el.id}` === conn.target);
          if (sourceEl && targetEl) {
            newConnections.push({
              id: `conn-${Date.now()}-${Math.random()}`,
              source: { elementId: sourceEl.id },
              target: { elementId: targetEl.id }
            });
          }
        });
        updateCanvasData(prev => ({ connections: [...prev.connections, ...newConnections] }), true);
        toast({ title: 'Connections Suggested!', description: 'AI has added connections between elements.' });
      } else {
        toast({ variant: "destructive", title: 'No Connections Found', description: 'The AI could not find any clear connections to suggest.' });
      }
    } catch (error) {
      toast({ variant: "destructive", title: 'Error', description: 'An error occurred while suggesting connections.' });
    }
  }, [notes, canvasData, toast, updateCanvasData, connections]);

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
      updateCanvasData(prev => ({ elements: [...prev.elements, newDrawingElement] }));
      return;
    } else if (activeTool) {
      setAction('creatingShape');
      setGhostElement({
        id: 'ghost',
        type: activeTool,
        x: canvasCoords.x,
        y: canvasCoords.y,
        width: 0,
        height: 0,
        content: '',
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
        initialState.current.initialSelectedIds = e.shiftKey ? [...selectedElementIds] : [];
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
      updateCanvasData(prev => ({
        elements: prev.elements.map(el => el.id === id ? { ...el, type: 'drawing', points: newPoints } : el)
      }));

    } else if (action === 'draggingToolbar') {
        if (!canvasContainerRef.current || initialState.current.toolbarX === undefined || initialState.current.toolbarY === undefined) return;
        
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const toolbarWidth = 52; 
        const toolbarHeight = 316; 

        let newX = initialState.current.toolbarX + dx;
        let newY = initialState.current.toolbarY + dy;

        newX = Math.max(0, Math.min(newX, containerRect.width - toolbarWidth));
        newY = Math.max(0, Math.min(newY, containerRect.height - toolbarHeight));

        setCanvasData(prev => prev ? ({...prev, toolbarPosition: { x: newX, y: newY }}) : null);
    } else if (action === 'panning') {
        if (!initialState.current?.initialTransform) return;
        setCanvasData(prev => prev ? ({
          ...prev,
          transform: {
            ...prev.transform,
            dx: initialState.current!.initialTransform!.dx + dx,
            dy: initialState.current!.initialTransform!.dy + dy,
          }
        }) : null);
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
        const baseIds = initialState.current.initialSelectedIds || [];
        
        setSelectedElementIds([...new Set([...baseIds, ...intersectingIds])]);

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

    } else if (action === 'dragging' && selectedElementIds.length > 0 && initialState.current?.elements) {
        updateCanvasData(prev => ({
            elements: initialState.current!.elements!.map(el => {
                if (selectedElementIds.includes(el.id)) {
                    const originalElement = initialState.current!.elements!.find(iel => iel.id === el.id)!;

                    if (el.type === 'drawing' && 'points' in el && 'points' in originalElement) {
                        const newPoints = originalElement.points.map(p => ({
                            x: p.x + dx / transform.scale,
                            y: p.y + dy / transform.scale,
                        }));
                        const bounds = getBoundsForDrawing(newPoints);
                        return { ...el, type: 'drawing', points: newPoints, ...bounds };
                    }
                    if ('x' in el && 'x' in originalElement) {
                        return { ...el, x: originalElement.x + dx / transform.scale, y: originalElement.y + dy / transform.scale };
                    }
                }
                return el;
            })
        }));
    } else if (action === 'resizing' && selectedElementIds.length === 1 && resizingHandle && initialState.current?.elements) {
        const elementId = selectedElementIds[0];
        updateCanvasData(prev => ({
            elements: prev.elements.map(el => {
                if (el.id === elementId && 'width' in el) {
                    const originalElement = initialState.current!.elements!.find(iel => iel.id === elementId)! as Extract<DiagramElement, { width: number }>;
                    let { x, y, width, height } = originalElement;
                    const aspectRatio = originalElement.width / originalElement.height;
                    const minSize = 20;

                    let newWidth = width;
                    let newHeight = height;

                    if (resizingHandle.includes('bottom')) { newHeight = originalElement.height + dy / transform.scale; }
                    if (resizingHandle.includes('top')) { 
                        newHeight = originalElement.height - dy / transform.scale;
                        if(newHeight > minSize) y = originalElement.y + dy / transform.scale;
                    }
                    if (resizingHandle.includes('right')) { newWidth = originalElement.width + dx / transform.scale; }
                    if (resizingHandle.includes('left')) { 
                        newWidth = originalElement.width - dx / transform.scale;
                        if(newWidth > minSize) x = originalElement.x + dx / transform.scale;
                    }

                    newWidth = Math.max(minSize, newWidth);
                    newHeight = Math.max(minSize, newHeight);

                    if (e.shiftKey && originalElement.width && originalElement.height) {
                         if (resizingHandle.includes('left') || resizingHandle.includes('right')) {
                            newHeight = newWidth / aspectRatio;
                        } else {
                            newWidth = newHeight * aspectRatio;
                        }

                        if (resizingHandle.includes('top')) { y = originalElement.y + (originalElement.height - newHeight); }
                        if (resizingHandle.includes('left')) { x = originalElement.x + (originalElement.width - newWidth); }
                    }

                    return { ...el, x, y, width: newWidth, height: newHeight };
                }
                return el;
            })
        }));
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    const isHistoryEvent = action === 'dragging' || action === 'resizing' || action === 'drawing' || action === 'creatingShape';

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
            updateCanvasData(prev => ({
                elements: prev.elements.map(el => 
                    el.id === id ? { ...el, ...getBoundsForDrawing(points) } : el
                )
            }), true);
        } else {
            // If it's just a click, remove the temporary drawing element
            updateCanvasData(prev => ({
                elements: prev.elements.filter(el => el.id !== id)
            }), false);
        }
    }
    else if (action === 'creatingShape' && activeTool && activeTool !== 'pen' && activeTool !== 'pan') {
      let finalElement: DiagramElement | null = null;
      if (ghostElement && ghostElement.width < 5 && ghostElement.height < 5) {
          const canvasCoords = screenToCanvas(e.clientX, e.clientY);
          const defaultWidth = 150;
          const defaultHeight = activeTool === 'sticky-note' ? 150 : (activeTool === 'text' ? 40 : 80);
          finalElement = {
              id: `el-${Date.now()}`,
              type: activeTool,
              width: defaultWidth,
              height: defaultHeight,
              x: canvasCoords.x - defaultWidth / 2, 
              y: canvasCoords.y - defaultHeight / 2,
              backgroundColor: activeTool === 'sticky-note' ? '#FFF9C4' : undefined,
              content: '',
          };
      } 
      else if (ghostElement) {
        finalElement = {
          ...ghostElement,
          id: `el-${Date.now()}`,
          backgroundColor: activeTool === 'sticky-note' ? '#FFF9C4' : undefined,
          content: '',
        };
      }
      
      if (finalElement) {
          const newElement = finalElement; // for type safety
          updateCanvasData(prev => ({
              elements: [...prev.elements, newElement]
          }), true);
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
        const finalGhost = { ...ghostElement, id: newElementId, content: '' };
        
        const newConnection: DiagramConnection = {
            id: `conn-${Date.now()}`,
            source: { elementId: sourceElementId },
            target: { elementId: newElementId },
        };
        
        updateCanvasData(prev => ({
            elements: [...prev.elements, finalGhost as DiagramElement],
            connections: [...prev.connections, newConnection]
        }), true);
        setAction('none');
    } else {
        if (isHistoryEvent && action !== 'drawing') { // drawing handles its own history
             updateCanvasData(prev => ({ elements: prev.elements }), true);
        }
        if (action !== 'editing') {
          setAction('none');
        }
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
    if (!el || el.type === 'drawing') return;
    cancelEditing(); 
    setAction('editing');
    setEditingElementId(elementId);
    setSelectedElementIds([elementId]);
  };
  
  const handleCanvasClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (action === 'editing' && target.id === 'diagram-canvas') {
        const textareaValue = textareaRef.current?.value;
        cancelEditing(textareaValue);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (!editingElementId) return;

    // This updates the visual state but doesn't save to history yet.
    // The final save happens on blur (cancelEditing).
    setCanvasData(prev => {
        if (!prev) return null;
        return {
            ...prev,
            elements: prev.elements.map(el => {
                if (el.id === editingElementId && 'content' in el) {
                    return { ...el, content: newContent };
                }
                return el;
            })
        }
    });
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.shiftKey) { // Pinch-to-zoom on trackpads OR Ctrl+Scroll
        const { clientX, clientY, deltaY } = e;
        const zoomFactor = 0.0005;
        
        setCanvasData(prev => {
            if (!prev) return null;
            const prevTransform = prev.transform;
            const newScale = Math.max(0.1, Math.min(5, prevTransform.scale * (1 - deltaY * zoomFactor)));
        
            const containerRect = canvasContainerRef.current?.getBoundingClientRect();
            if (!containerRect) return prev;
        
            const mouseX = clientX - containerRect.left;
            const mouseY = clientY - containerRect.top;
            
            // Pan to keep the mouse position consistent relative to the canvas content
            const newDx = mouseX - (mouseX - prevTransform.dx) * (newScale / prevTransform.scale);
            const newDy = mouseY - (mouseY - prevTransform.dy) * (newScale / prevTransform.scale);
        
            return { ...prev, transform: { scale: newScale, dx: newDx, dy: newDy } };
        });
    } else { // Pan with mouse wheel or two-finger swipe on trackpads
        const { deltaX, deltaY } = e;
        setCanvasData(prev => {
            if (!prev) return null;
            const prevTransform = prev.transform;
            return {
                ...prev,
                transform: {
                    ...prevTransform,
                    dx: prevTransform.dx - deltaX,
                    dy: prevTransform.dy - deltaY,
                }
            };
        });
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
  
  const diagramView = (
    <div className="w-full h-full relative"
    >
      <DiagramView 
          elements={elements} 
          connections={connections} 
          ghostElement={ghostElement}
          marqueeRect={marqueeRect}
          onToolSelect={handleToolSelect}
          onCanvasMouseDown={handleCanvasMouseDown}
          onCanvasMouseMove={handleCanvasMouseMove}
          onCanvasMouseUp={handleCanvasMouseUp}
          onCanvasClick={handleCanvasClick}
          selectedElementIds={selectedElementIds}
          activeTool={activeTool}
          editingElementId={editingElementId}
          onElementDoubleClick={handleElementDoubleClick}
          toolbarPosition={toolbarPosition}
          onToolbarMouseDown={handleToolbarMouseDown}
          transform={transform}
          onWheel={handleWheel}
          getCursor={getCursor}
      />
       {action === 'editing' && editingElementId && (
          (() => {
              const el = elements.find(e => e.id === editingElementId) as Extract<DiagramElement, { x: number }>;
              if (!el || !('content' in el)) return null;
              
              const left = transform.dx + el.x * transform.scale;
              const top = transform.dy + el.y * transform.scale;
              const width = el.width * transform.scale;
              const height = el.height * transform.scale;
              
              return (
                  <textarea
                      ref={textareaRef}
                      value={el.content}
                      onChange={handleTextareaChange}
                      onBlur={(e) => cancelEditing(e.target.value)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              cancelEditing(e.target.value);
                          }
                          if (e.key === 'Escape') {
                              cancelEditing(el.content);
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
  )

  const notepad = (
     <div className="w-full h-full overflow-y-auto">
      <NotepadView content={notes} onContentChange={handleNotesChange} />
    </div>
  )

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
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />
      <div 
        className="flex-grow flex"
        style={{ paddingTop }}
        ref={canvasContainerRef}
      >
        {view === 'document' && notepad}
        {view === 'canvas' && diagramView}
        {view === 'both' && (
          <>
            <div className="w-1/2 h-full border-r">{notepad}</div>
            <div className="w-1/2 h-full">{diagramView}</div>
          </>
        )}
      </div>
    </main>
  );
}

    

    