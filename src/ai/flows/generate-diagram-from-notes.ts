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
  diagramLayout: z.string().describe('The generated diagram layout in a textual format.'),
});
export type GenerateDiagramFromNotesOutput = z.infer<typeof GenerateDiagramFromNotesOutputSchema>;

export async function generateDiagramFromNotes(input: GenerateDiagramFromNotesInput): Promise<GenerateDiagramFromNotesOutput> {
  return generateDiagramFromNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDiagramFromNotesPrompt',
  input: {schema: GenerateDiagramFromNotesInputSchema},
  output: {schema: GenerateDiagramFromNotesOutputSchema},
  prompt: `You are a diagram generation expert. You will receive notes as input, and you will output a textual representation of a diagram layout that visually represents the notes. The output should be a textual description of the diagram, including shapes, connections, and labels.\n\nNotes: {{{notes}}}`,
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
