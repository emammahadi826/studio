
'use client';

import React, { useState } from 'react';
import { Circle, Square, Type, StickyNote, Diamond, Triangle, Cylinder, Move, MousePointer2, Pen, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DiagramElement, DiagramConnection } from '@/types';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

function getSvgPathFromStroke(stroke: {x:number, y:number}[]) {
  if (!stroke || stroke.length === 0) return "";
  const d = stroke.reduce(
    (acc, { x, y }, i, a) => {
      if (i === 0) return `M ${x},${y}`;
      const [lastX, lastY] = [a[i-1].x, a[i-1].y];
      const [nextX, nextY] = [a[i+1]?.x, a[i+1]?.y];
      const C = (p1:number, p2:number) => (p1 + p2) / 2;
      return `${acc} Q ${lastX},${lastY} ${C(lastX,x)},${C(lastY,y)}`;
    },
    ""
  );
  return d;
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


function DiagramToolbar({ 
    onToolSelect, 
    activeTool,
    position,
    onMouseDown,
}: { 
    onToolSelect: (type: DiagramElement['type'] | 'pen' | 'pan' | null) => void, 
    activeTool: DiagramElement['type'] | 'pen' | 'pan' | null,
    position: { x: number, y: number },
    onMouseDown: (e: React.MouseEvent) => void,
}) {
  const tools = [
    { type: null, icon: MousePointer2, label: 'Select' },
    { type: 'pan', icon: Hand, label: 'Pan' },
    { type: 'pen', icon: Pen, label: 'Pen' },
    { type: 'rectangle', icon: Square, label: 'Rectangle' },
    { type: 'circle', icon: Circle, label: 'Circle' },
    { type: 'diamond', icon: Diamond, label: 'Diamond' },
    { type: 'triangle', icon: Triangle, label: 'Triangle' },
    { type: 'cylinder', icon: Cylinder, label: 'Cylinder' },
    { type: 'sticky-note', icon: StickyNote, label: 'Sticky Note' },
    { type: 'text', icon: Type, label: 'Text' },
  ] as const;

  return (
    <div 
        className="absolute z-10 bg-card p-2 rounded-lg border shadow-md flex flex-col gap-1"
        style={{ top: position.y, left: position.x }}
    >
      <div 
        className="cursor-move text-center py-1 text-muted-foreground"
        onMouseDown={onMouseDown}
      >
        <Move className="w-4 h-4 mx-auto" />
      </div>
      <TooltipProvider delayDuration={0}>
        {tools.slice(0, 3).map((tool) => (
          <Tooltip key={tool.label}>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onToolSelect(tool.type)}
                className={cn(activeTool === tool.type && 'bg-accent')}
              >
                <tool.icon className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        <Separator className="my-1" />
        {tools.slice(3).map((tool) => (
          <Tooltip key={tool.type}>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onToolSelect(tool.type)}
                className={cn(activeTool === tool.type && 'bg-accent')}
              >
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
type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

function Element({ 
  element,
  onMouseDown,
  onDoubleClick,
  isSelected,
  isEditing,
  transform,
}: { 
  element: DiagramElement;
  onMouseDown: (e: React.MouseEvent<any>, elementId: string, handle?: ResizingHandle | AnchorSide) => void;
  onDoubleClick: (elementId: string) => void;
  isSelected: boolean;
  isEditing: boolean;
  transform: { scale: number };
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const bounds = element.type === 'drawing' ? getBoundsForDrawing(element.points) : element;

  const commonProps = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
  
  const styleProps = {
    fill: element.type === 'sticky-note' ? (element.backgroundColor || '#FFF9C4') : 'transparent',
    stroke: isSelected ? 'hsl(var(--primary))' : (element.type === 'sticky-note' ? '#E0C000' : 'hsl(var(--foreground))'),
    strokeWidth: isSelected ? 2 / transform.scale : (element.type === 'sticky-note' ? 1 / transform.scale : 2 / transform.scale),
    cursor: 'move',
  };

  const textDiv = (
    <div 
        xmlns="http://www.w3.org/1999/xhtml" 
        className="flex items-center justify-center h-full text-center p-2 break-words text-sm font-sans"
        style={{ 
          color: 'hsl(var(--foreground))', 
          fontFamily: 'Inter', 
          pointerEvents: 'none',
          visibility: isEditing ? 'hidden' : 'visible'
        }}
    >
        {element.content}
    </div>
  )

  const stickyNoteTextDiv = (
      <div 
        xmlns="http://www.w3.org/1999/xhtml" 
        className="flex items-center justify-center h-full text-center p-4 break-words"
        style={{ 
          color: '#333', 
          fontFamily: 'Inter', 
          pointerEvents: 'none',
          visibility: isEditing ? 'hidden' : 'visible' 
        }}
    >
        {element.content}
    </div>
  )

  const handleSize = 8 / transform.scale;
  const handles: { position: ResizingHandle; cursor: string; x: number; y: number }[] = [
    { position: 'top-left', cursor: 'nwse-resize', x: bounds.x - handleSize/2, y: bounds.y - handleSize/2 },
    { position: 'top-right', cursor: 'nesw-resize', x: bounds.x + bounds.width - handleSize/2, y: bounds.y - handleSize/2 },
    { position: 'bottom-left', cursor: 'nesw-resize', x: bounds.x - handleSize/2, y: bounds.y + bounds.height - handleSize/2 },
    { position: 'bottom-right', cursor: 'nwse-resize', x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height - handleSize/2 },
    { position: 'top', cursor: 'ns-resize', x: bounds.x + bounds.width / 2 - handleSize / 2, y: bounds.y - handleSize/2 },
    { position: 'bottom', cursor: 'ns-resize', x: bounds.x + bounds.width / 2 - handleSize / 2, y: bounds.y + bounds.height - handleSize/2 },
    { position: 'left', cursor: 'ew-resize', x: bounds.x - handleSize/2, y: bounds.y + bounds.height / 2 - handleSize / 2 },
    { position: 'right', cursor: 'ew-resize', x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height / 2 - handleSize / 2 },
  ];

  const anchorSize = 10;
  const anchors: { side: AnchorSide, x: number, y: number }[] = [
      { side: 'top', x: bounds.x + bounds.width / 2 - anchorSize/2, y: bounds.y - anchorSize/2 },
      { side: 'right', x: bounds.x + bounds.width - anchorSize/2, y: bounds.y + bounds.height/2 - anchorSize/2 },
      { side: 'bottom', x: bounds.x + bounds.width / 2 - anchorSize/2, y: bounds.y + bounds.height - anchorSize/2 },
      { side: 'left', x: bounds.x - anchorSize/2, y: bounds.y + bounds.height/2 - anchorSize/2 },
  ];
  
  const handleMouseDown = (e: React.MouseEvent<any>) => onMouseDown(e, element.id)
  const handleDoubleClick = () => onDoubleClick(element.id)

  const renderElement = () => {
    switch (element.type) {
      case 'rectangle':
        return (
          <>
            <rect {...commonProps} {...styleProps} rx={8 / transform.scale} ry={8 / transform.scale} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} />
            <foreignObject {...commonProps}>{textDiv}</foreignObject>
          </>
        );
      case 'circle':
        return (
          <>
            <ellipse cx={bounds.x + bounds.width / 2} cy={bounds.y + bounds.height / 2} rx={bounds.width / 2} ry={bounds.height / 2} {...styleProps} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} />
            <foreignObject {...commonProps}>{textDiv}</foreignObject>
          </>
        );
      case 'diamond':
        const { x, y, width, height } = bounds;
        const points = `${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}`;
        return (
          <>
            <polygon points={points} {...styleProps} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} />
            <foreignObject {...commonProps}>{textDiv}</foreignObject>
          </>
        );
      case 'triangle': {
        const { x, y, width, height } = bounds;
        const points = `${x + width / 2},${y} ${x + width},${y + height} ${x},${y + height}`;
        return (
          <>
            <polygon points={points} {...styleProps} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} />
            <foreignObject {...commonProps}>{textDiv}</foreignObject>
          </>
        );
      }
      case 'cylinder': {
        const { x, y, width, height } = bounds;
        const ellipseHeight = Math.min(height * 0.3, 20);
        return (
          <>
             <g onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} cursor="move">
                <path 
                  d={`M${x},${y + ellipseHeight / 2} 
                     C${x},${y - ellipseHeight / 2} ${x + width},${y - ellipseHeight / 2} ${x + width},${y + ellipseHeight / 2}
                     L${x + width},${y + height - ellipseHeight / 2}
                     C${x + width},${y + height + ellipseHeight / 2} ${x},${y + height + ellipseHeight / 2} ${x},${y + height - ellipseHeight / 2}
                     Z`}
                    {...styleProps}
                />
                 <ellipse 
                  cx={x + width / 2} 
                  cy={y + ellipseHeight / 2} 
                  rx={width / 2} 
                  ry={ellipseHeight / 2} 
                  {...styleProps}
                />
                <rect {...commonProps} fill="transparent" />
                <foreignObject {...commonProps}>{textDiv}</foreignObject>
            </g>
          </>
        );
      }
      case 'sticky-note':
        return (
          <>
            <rect {...commonProps} {...styleProps} transform={`rotate(-2 ${bounds.x + bounds.width/2} ${bounds.y + bounds.height/2})`} style={{ filter: 'drop-shadow(3px 3px 2px rgba(0,0,0,0.2))', cursor: 'move' }} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} />
            <foreignObject {...commonProps} transform={`rotate(-2 ${bounds.x + bounds.width/2} ${bounds.y + bounds.height/2})`}>{stickyNoteTextDiv}</foreignObject>
          </>
        );
      case 'text':
        return (
            <foreignObject {...commonProps} cursor="move" onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick}>{textDiv}</foreignObject>
        );
      case 'drawing': {
        if (!element.points || element.points.length === 0) return null;
        const pathData = getSvgPathFromStroke(element.points);
        return (
          <g onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} cursor="move">
            {/* Wider, transparent path for easier selection */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth={20 / transform.scale}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* The visible path */}
            <path
              d={pathData}
              fill="none"
              stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'}
              strokeWidth={isSelected ? 4 / transform.scale : 3 / transform.scale}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      }
      default:
        return null;
    }
  }

  return (
    <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {renderElement()}
      {isSelected && !isEditing && (
        <>
            {element.type !== 'drawing' && handles.map(handle => (
                <rect
                    key={handle.position}
                    x={handle.x}
                    y={handle.y}
                    width={handleSize}
                    height={handleSize}
                    fill="hsla(var(--background), 0.5)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1 / transform.scale}
                    cursor={handle.cursor}
                    onMouseDown={(e) => onMouseDown(e, element.id, handle.position)}
                />
            ))}
            {element.type === 'drawing' && (
                 <rect
                    x={bounds.x}
                    y={bounds.y}
                    width={bounds.width}
                    height={bounds.height}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5 / transform.scale}
                    strokeDasharray={`${4 / transform.scale}`}
                    rx={4 / transform.scale} ry={4 / transform.scale}
                    style={{ pointerEvents: 'none' }}
                />
            )}
        </>
      )}
       {isHovered && !isSelected && !isEditing && element.type !== 'drawing' && (
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          fill="transparent"
          stroke="hsl(var(--primary))"
          strokeWidth={1 / transform.scale}
          rx={8 / transform.scale} ry={8 / transform.scale}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  );
}

function GhostElement({ element, transform }: { element: DiagramElement | null, transform: { scale: number } }) {
    if (!element || element.type === 'drawing') return null;

    const commonProps = {
        fill: "hsla(var(--primary), 0.2)",
        stroke: "hsl(var(--primary))",
        strokeWidth: 2 / transform.scale,
        strokeDasharray: `${5 / transform.scale} ${5 / transform.scale}`,
    };

    switch (element.type) {
        case 'circle':
            return (
                <ellipse
                    cx={element.x + element.width / 2}
                    cy={element.y + element.height / 2}
                    rx={element.width / 2}
                    ry={element.height / 2}
                    {...commonProps}
                />
            );
        case 'diamond':
            const { x: dx, y: dy, width: dw, height: dh } = element;
            const dpoints = `${dx + dw / 2},${dy} ${dx + dw},${dy + dh / 2} ${dx + dw / 2},${dy + dh} ${dx},${dy + dh / 2}`;
            return (
                <polygon points={dpoints} {...commonProps} />
            );
        case 'triangle':
            const { x: tx, y: ty, width: tw, height: th } = element;
            const tpoints = `${tx + tw / 2},${ty} ${tx + tw},${ty + th} ${tx},${ty + th}`;
            return (
                <polygon points={tpoints} {...commonProps} />
            );
        case 'cylinder': {
            const { x, y, width, height } = element;
            const ellipseHeight = Math.min(height * 0.3, 20);
            return (
                <>
                    <path
                        d={`M${x},${y + ellipseHeight / 2} C${x},${y - ellipseHeight / 2} ${x + width},${y - ellipseHeight / 2} ${x + width},${y + ellipseHeight / 2} L${x + width},${y + height - ellipseHeight / 2} C${x + width},${y + height + ellipseHeight / 2} ${x},${y + height + ellipseHeight / 2} ${x},${y + height - ellipseHeight / 2} Z`}
                        {...commonProps}
                    />
                    <ellipse
                        cx={x + width / 2}
                        cy={y + ellipseHeight / 2}
                        rx={width / 2}
                        ry={ellipseHeight / 2}
                        {...commonProps}
                    />
                </>
            );
        }
        case 'rectangle':
        case 'sticky-note':
        case 'text':
        default:
            return (
                <rect
                    x={element.x}
                    y={element.y}
                    width={element.width}
                    height={element.height}
                    {...commonProps}
                    rx={8 / transform.scale}
                    ry={8 / transform.scale}
                />
            );
    }
}

function Marquee({ rect, transform }: { rect: { x: number; y: number; width: number; height: number; } | null, transform: { scale: number } }) {
    if (!rect) return null;
    return (
        <rect
            {...rect}
            rx={8 / transform.scale}
            ry={8 / transform.scale}
            fill="hsla(217, 91%, 60%, 0.3)"
            stroke="hsl(var(--primary))"
            strokeWidth={1 / transform.scale}
        />
    );
}

function Connection({ connection, elements, transform }: { connection: DiagramConnection; elements: DiagramElement[], transform: { scale: number } }) {
    const sourceEl = elements.find(el => el.id === connection.source.elementId);
    const targetEl = elements.find(el => el.id === connection.target.elementId);

    if (!sourceEl || !targetEl) return null;

    const sourceBounds = sourceEl.type === 'drawing' ? getBoundsForDrawing(sourceEl.points) : sourceEl;
    const targetBounds = targetEl.type === 'drawing' ? getBoundsForDrawing(targetEl.points) : targetEl;
    
    const x1 = sourceBounds.x + sourceBounds.width / 2;
    const y1 = sourceBounds.y + sourceBounds.height / 2;
    const x2 = targetBounds.x + targetBounds.width / 2;
    const y2 = targetBounds.y + targetBounds.height / 2;

    return (
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--foreground))" strokeWidth={2 / transform.scale} markerEnd="url(#arrowhead)" />
    );
}

interface DiagramViewProps {
  elements: DiagramElement[];
  connections: DiagramConnection[];
  ghostElement: DiagramElement | null;
  marqueeRect: { x: number; y: number; width: number; height: number; } | null;
  onToolSelect: (type: DiagramElement['type'] | 'pen' | 'pan' | null) => void;
  onCanvasMouseDown: (e: React.MouseEvent, elementId: string | null, handle?: ResizingHandle | AnchorSide) => void;
  selectedElementIds: string[];
  activeTool: DiagramElement['type'] | 'pen' | 'pan' | null;
  editingElementId: string | null;
  onElementDoubleClick: (elementId: string) => void;
  toolbarPosition: { x: number; y: number; };
  onToolbarMouseDown: (e: React.MouseEvent) => void;
  transform: { scale: number, dx: number, dy: number };
}

export function DiagramView({ 
    elements, 
    connections, 
    ghostElement, 
    marqueeRect, 
    onToolSelect, 
    onCanvasMouseDown, 
    selectedElementIds, 
    activeTool, 
    editingElementId, 
    onElementDoubleClick,
    toolbarPosition,
    onToolbarMouseDown,
    transform,
}: DiagramViewProps) {
  return (
    <div className="w-full h-full relative" id="diagram-canvas-container">
      <DiagramToolbar 
        onToolSelect={onToolSelect} 
        activeTool={activeTool} 
        position={toolbarPosition}
        onMouseDown={onToolbarMouseDown}
       />
      <svg 
        id="diagram-canvas" 
        width="100%" 
        height="100%" 
        className="bg-background"
        onMouseDown={(e) => {
            // Check if the event target is the SVG itself, not a child element
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
        <g transform={`translate(${transform.dx}, ${transform.dy}) scale(${transform.scale})`}>
            {connections.map(conn => (
                <Connection key={conn.id} connection={conn} elements={elements} transform={transform} />
            ))}
            {elements.map(el => (
                <Element 
                    key={el.id} 
                    element={el}
                    onMouseDown={onCanvasMouseDown}
                    onDoubleClick={onElementDoubleClick}
                    isSelected={selectedElementIds.includes(el.id)}
                    isEditing={editingElementId === el.id}
                    transform={transform}
                 />
            ))}
            <GhostElement element={ghostElement} transform={transform} />
            <Marquee rect={marqueeRect} transform={transform} />
        </g>
      </svg>
    </div>
  );
}
