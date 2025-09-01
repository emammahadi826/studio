
// Define the Genkit flow for generating a diagram layout from notes.
'use server';
/**
 * @fileOverview Generates a diagram layout from user notes using AI.
 *
 * - generateDiagramFromNotes - A function that generates a diagram layout based on the provided notes.
 * - GenerateDiagramFromNotesInput - The input type for the generateDiagramFromNotes function.
 * - GenerateDiagramFromNotesOutput - The return type for the generateDiagramFromNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDiagramFromNotesInputSchema = z.object({
  notes: z.string().describe('The notes to generate the diagram from.'),
});
export type GenerateDiagramFromNotesInput = z.infer<typeof GenerateDiagramFromNotesInputSchema>;

const GenerateDiagramFromNotesOutputSchema = z.object({
  diagramLayout: z.string().describe('The generated diagram layout in a textual format. Each element should be on a new line.'),
});
export type GenerateDiagramFromNotesOutput = z.infer<typeof GenerateDiagramFromNotesOutputSchema>;

export async function generateDiagramFromNotes(input: GenerateDiagramFromNotesInput): Promise<GenerateDiagramFromNotesOutput> {
  return generateDiagramFromNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDiagramFromNotesPrompt',
  input: {schema: GenerateDiagramFromNotesInputSchema},
  output: {schema: GenerateDiagramFromNotesOutputSchema},
  prompt: `You are an expert at creating diagrams from text. Your task is to convert the given notes into a list of diagram elements. Each element must be on its own line.

You can create the following types of elements:
- A rectangle with the text "..."
- A circle with the text "..."
- A diamond with the text "..."
- A sticky note with the text "..."
- A text label with the text "..."

Based on the notes provided, identify the key entities, concepts, or steps. For each one, create a diagram element on a new line.

Example:
Notes: "The process starts with user authentication. If successful, the user is redirected to the dashboard. The dashboard shows a summary of their data."
Your output should be:
rectangle with text "User Authentication"
diamond with text "Successful?"
rectangle with text "Dashboard"
text label with text "Shows data summary"

Notes: {{{notes}}}`,
});

const generateDiagramFromNotesFlow = ai.defineFlow(
  {
    name: 'generateDiagramFromNotesFlow',
    inputSchema: GenerateDiagramFromNotesInputSchema,
    outputSchema: GenerateDiagramFromNotesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
