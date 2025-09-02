
import { Timestamp } from "firebase/firestore";

export interface CanvasMetadata {
  id: string;
  name: string;
  createdAt: Timestamp | string;
  lastModified: Timestamp | string;
  userId: string;
}

export type DiagramElement = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  backgroundColor?: string;
} & (
  | { type: 'rectangle' | 'circle' | 'diamond' | 'triangle' | 'cylinder' | 'sticky-note' | 'text' }
  | { type: 'drawing', points: {x: number, y: number}[] }
)


export interface DiagramConnection {
  id: string;
  source: {
    elementId: string;
  };
  target: {
    elementId: string;
  };
}

export interface CanvasData {
    name: string;
    notes: string;
    elements: DiagramElement[];
    connections: DiagramConnection[];
    toolbarPosition: { x: number, y: number };
    transform: { scale: number, dx: number, dy: number };
    createdAt?: Timestamp;
    lastModified?: Timestamp;
    userId: string;
}
