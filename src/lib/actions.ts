
'use server';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';

import {
  generateDiagramFromNotes,
  GenerateDiagramFromNotesInput,
} from '@/ai/flows/generate-diagram-from-notes';
import {
  suggestDiagramConnections,
  SuggestDiagramConnectionsInput,
  SuggestDiagramConnectionsOutput,
} from '@/ai/flows/suggest-diagram-connections';
import type { DiagramElement, DiagramConnection } from '@/types';

function parseDiagramLayout(layout: string): DiagramElement[] {
  const elements: DiagramElement[] = [];
  if (!layout) return elements;

  const lines = layout.split('\n').filter(line => line.trim() !== '');
  let idCounter = Date.now();

  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    let type: DiagramElement['type'] | null = null;
    
    // More robust matching for element types
    if (lowerLine.includes('rectangle')) type = 'rectangle';
    else if (lowerLine.includes('circle')) type = 'circle';
    else if (lowerLine.includes('diamond')) type = 'diamond';
    else if (lowerLine.includes('triangle')) type = 'triangle';
    else if (lowerLine.includes('cylinder')) type = 'cylinder';
    else if (lowerLine.includes('sticky note')) type = 'sticky-note';
    else if (lowerLine.includes('text label')) type = 'text';

    // Extract content within quotes
    const contentMatch = line.match(/['"](.*?)['"]/);
    const content = contentMatch ? contentMatch[1] : line;

    if (type) {
      elements.push({
        id: `el-${idCounter++}`,
        type,
        content,
        x: 100 + (index % 4) * 200,
        y: 100 + Math.floor(index / 4) * 150,
        width: 150,
        height: type === 'sticky-note' ? 150 : (type === 'text' ? 40 : 80),
        backgroundColor: type === 'sticky-note' ? '#FFF9C4' : undefined,
      });
    }
  });

  return elements;
}

// Function to convert HTML to plain text
function htmlToPlainText(html: string): Promise<string> {
    // Tiptap's generateHTML can also be used to generate text from a JSON document,
    // but here we use a simpler approach of creating a document from HTML and then getting text.
    // This is a bit of a workaround because generateText is not available server-side in the same way.
    // A more robust solution might involve a different library if complex HTML is expected.
    
    // For now, a simple regex-based strip should be sufficient for the AI.
    return Promise.resolve(html.replace(/<[^>]*>?/gm, ' '));
}

async function tryGenerateDiagram(input: GenerateDiagramFromNotesInput, retries = 1): Promise<{ elements: DiagramElement[] }> {
  try {
    const plainTextNotes = await htmlToPlainText(input.notes);
    const { diagramLayout } = await generateDiagramFromNotes({ ...input, notes: plainTextNotes });

    if (!diagramLayout) {
       if (retries > 0) {
           return tryGenerateDiagram(input, retries - 1);
       }
       return { elements: [] };
    }
    
    const elements = parseDiagramLayout(diagramLayout);
    
    if (elements.length === 0 && retries > 0) {
        return tryGenerateDiagram(input, retries - 1);
    }

    return { elements };
  } catch (error) {
    console.error('Error generating diagram:', error);
    if (retries > 0) {
        return tryGenerateDiagram(input, retries - 1);
    }
    return { elements: [] };
  }
}

export async function generateDiagramAction(
  input: GenerateDiagramFromNotesInput
): Promise<{ elements: DiagramElement[] }> {
    return tryGenerateDiagram(input, 1); // Allow one retry
}


export async function suggestConnectionsAction(
  input: SuggestDiagramConnectionsInput
): Promise<{ connections: SuggestDiagramConnectionsOutput['connections'] }> {
  try {
     const plainTextNotes = await htmlToPlainText(input.notes);
    const result = await suggestDiagramConnections({ ...input, notes: plainTextNotes });
    return result || { connections: [] };
  } catch (error) {
    console.error('Error suggesting connections:', error);
    return { connections: [] };
  }
}
