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
  const lines = layout.split('\n').filter(line => line.trim() !== '');
  let idCounter = Date.now();

  lines.forEach((line, index) => {
    const rectMatch = line.match(/rectangle with text ['"](.*?)['"]/i);
    const circleMatch = line.match(/circle with text ['"](.*?)['"]/i);
    const noteMatch = line.match(/sticky note with text ['"](.*?)['"]/i);
    const textMatch = line.match(/text label ['"](.*?)['"]/i);

    let type: DiagramElement['type'] | null = null;
    let content = '';

    if (rectMatch) {
      type = 'rectangle';
      content = rectMatch[1];
    } else if (circleMatch) {
      type = 'circle';
      content = circleMatch[1];
    } else if (noteMatch) {
      type = 'sticky-note';
      content = noteMatch[1];
    } else if (textMatch) {
      type = 'text';
      content = textMatch[1];
    }

    if (type && content) {
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

export async function generateDiagramAction(
  input: GenerateDiagramFromNotesInput
): Promise<{ elements: DiagramElement[] }> {
  try {
    const plainTextNotes = await htmlToPlainText(input.notes);
    const { diagramLayout } = await generateDiagramFromNotes({ ...input, notes: plainTextNotes });

    if (!diagramLayout) {
       return { elements: [] };
    }
    const elements = parseDiagramLayout(diagramLayout);
    return { elements };
  } catch (error) {
    console.error('Error generating diagram:', error);
    return { elements: [] };
  }
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
