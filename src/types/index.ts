
import { Timestamp } from "firebase/firestore";

export interface CanvasMetadata {
  id: string;
  name: string;
  createdAt: Timestamp | string;
  lastModified: Timestamp | string;
  userId: string;
}

export interface DiagramElement {
  id: string;
  type: 'rectangle' | 'circle' | 'sticky-note' | 'text' | 'diamond' | 'triangle' | 'cylinder';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  backgroundColor?: string;
}

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
    createdAt: Timestamp;
    lastModified: Timestamp;
    userId: string;
}
