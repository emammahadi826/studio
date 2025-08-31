'use client';

import { Circle, Square, Type, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DiagramElement, DiagramConnection } from '@/types';

function DiagramToolbar({ onAddElement }: { onAddElement: (type: DiagramElement['type']) => void }) {
  const tools = [
    { type: 'rectangle', icon: Square, label: 'Rectangle' },
    { type: 'circle', icon: Circle, label: 'Circle' },
    { type: 'sticky-note', icon: StickyNote, label: 'Sticky Note' },
    { type: 'text', icon: Type, label: 'Text' },
  ] as const;

  return (
    <div className="absolute top-1/2 -translate-y-1/2 left-4 z-10 bg-card p-2 rounded-lg border shadow-md flex flex-col gap-1">
      <TooltipProvider delayDuration={0}>
        {tools.map((tool) => (
          <Tooltip key={tool.type}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onAddElement(tool.type)}>
                <tool.icon className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add {tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}

type ResizingHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';


function Element({ 
  element,
  onMouseDown,
  isSelected,
}: { 
  element: DiagramElement;
  onMouseDown: (e: React.MouseEvent<any>, elementId: string, handle?: ResizingHandle) => void;
  isSelected: boolean;
}) {
  const commonProps = {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };

  const textDiv = (
    <div 
        xmlns="http://www.w3.org/1999/xhtml" 
        className="flex items-center justify-center h-full text-center p-2 break-words text-sm font-sans"
        style={{ color: 'hsl(var(--foreground))', fontFamily: 'Inter', pointerEvents: 'none' }}
    >
        {element.content}
    </div>
  )

  const stickyNoteTextDiv = (
      <div 
        xmlns="http://www.w3.org/1999/xhtml" 
        className="flex items-center justify-center h-full text-center p-4 break-words"
        style={{ color: '#333', fontFamily: 'Inter', pointerEvents: 'none' }}
    >
        {element.content}
    </div>
  )

  const handleSize = 8;
  const handles: { position: ResizingHandle; cursor: string; x: number; y: number }[] = [
    { position: 'top-left', cursor: 'nwse-resize', x: element.x, y: element.y },
    { position: 'top-right', cursor: 'nesw-resize', x: element.x + element.width - handleSize, y: element.y },
    { position: 'bottom-left', cursor: 'nesw-resize', x: element.x, y: element.y + element.height - handleSize },
    { position: 'bottom-right', cursor: 'nwse-resize', x: element.x + element.width - handleSize, y: element.y + element.height - handleSize },
    { position: 'top', cursor: 'ns-resize', x: element.x + element.width / 2 - handleSize / 2, y: element.y },
    { position: 'bottom', cursor: 'ns-resize', x: element.x + element.width / 2 - handleSize / 2, y: element.y + element.height - handleSize },
    { position: 'left', cursor: 'ew-resize', x: element.x, y: element.y + element.height / 2 - handleSize / 2 },
    { position: 'right', cursor: 'ew-resize', x: element.x + element.width - handleSize, y: element.y + element.height / 2 - handleSize / 2 },
  ];
  
  const renderElement = () => {
    switch (element.type) {
      case 'rectangle':
        return (
          <>
            <rect {...commonProps} rx="8" ry="8" fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth="2" cursor="move" onMouseDown={(e) => onMouseDown(e, element.id)} />
            <foreignObject {...commonProps}>{textDiv}</foreignObject>
          </>
        );
      case 'circle':
        return (
          <>
            <ellipse cx={element.x + element.width / 2} cy={element.y + element.height / 2} rx={element.width / 2} ry={element.height / 2} fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth="2" cursor="move" onMouseDown={(e) => onMouseDown(e, element.id)} />
            <foreignObject {...commonProps}>{textDiv}</foreignObject>
          </>
        );
      case 'sticky-note':
        return (
          <>
            <rect {...commonProps} fill={element.backgroundColor || '#FFF9C4'} stroke="#E0C000" strokeWidth="1" transform={`rotate(-2 ${element.x + element.width/2} ${element.y + element.height/2})`} style={{ filter: 'drop-shadow(3px 3px 2px rgba(0,0,0,0.2))', cursor: 'move' }} onMouseDown={(e) => onMouseDown(e, element.id)} />
            <foreignObject {...commonProps} transform={`rotate(-2 ${element.x + element.width/2} ${element.y + element.height/2})`}>{stickyNoteTextDiv}</foreignObject>
          </>
        );
      case 'text':
        return (
            <foreignObject {...commonProps} cursor="move" onMouseDown={(e) => onMouseDown(e, element.id)}>{textDiv}</foreignObject>
        );
      default:
        return null;
    }
  }

  return (
    <g>
        {renderElement()}
        {isSelected && handles.map(handle => (
            <rect
                key={handle.position}
                x={handle.x}
                y={handle.y}
                width={handleSize}
                height={handleSize}
                fill="hsl(var(--primary))"
                stroke="hsl(var(--primary-foreground))"
                strokeWidth="1"
                cursor={handle.cursor}
                onMouseDown={(e) => onMouseDown(e, element.id, handle.position)}
            />
        ))}
    </g>
  );
}

function Connection({ connection, elements }: { connection: DiagramConnection; elements: DiagramElement[] }) {
    const sourceEl = elements.find(el => el.id === connection.source.elementId);
    const targetEl = elements.find(el => el.id === connection.target.elementId);

    if (!sourceEl || !targetEl) return null;

    const x1 = sourceEl.x + sourceEl.width / 2;
    const y1 = sourceEl.y + sourceEl.height / 2;
    const x2 = targetEl.x + targetEl.width / 2;
    const y2 = targetEl.y + targetEl.height / 2;

    return (
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--foreground))" strokeWidth="2" markerEnd="url(#arrowhead)" />
    );
}

interface DiagramViewProps {
  elements: DiagramElement[];
  connections: DiagramConnection[];
  onAddElement: (type: DiagramElement['type']) => void;
  onCanvasMouseDown: (e: React.MouseEvent<SVGSVGElement>, elementId: string | null, handle?: ResizingHandle) => void;
  selectedElementId: string | null;
}

export function DiagramView({ elements, connections, onAddElement, onCanvasMouseDown, selectedElementId }: DiagramViewProps) {
  return (
    <div className="w-full h-full relative" id="diagram-canvas-container">
      <DiagramToolbar onAddElement={onAddElement} />
      <svg 
        id="diagram-canvas" 
        width="100%" 
        height="100%" 
        className="bg-background"
        onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
                onCanvasMouseDown(e, null);
            }
        }}
        >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,7 L9,3.5 z" fill="hsl(var(--foreground))" />
          </marker>
        </defs>
        <g>
            {connections.map(conn => (
                <Connection key={conn.id} connection={conn} elements={elements} />
            ))}
            {elements.map(el => (
                <Element 
                    key={el.id} 
                    element={el}
                    onMouseDown={onCanvasMouseDown}
                    isSelected={el.id === selectedElementId}
                 />
            ))}
        </g>
      </svg>
    </div>
  );
}
