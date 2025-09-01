
export interface CanvasMetadata {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  userId?: string;
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
