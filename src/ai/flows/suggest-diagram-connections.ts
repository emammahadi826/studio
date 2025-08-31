// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting diagram connections based on notes.
 *
 * - suggestDiagramConnections - A function that suggests connections between diagram elements based on the content of notes.
 * - SuggestDiagramConnectionsInput - The input type for the suggestDiagramConnections function, including notes and diagram elements.
 * - SuggestDiagramConnectionsOutput - The output type for the suggestDiagramConnections function, providing suggested connections.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDiagramConnectionsInputSchema = z.object({
  notes: z.string().describe('The notes from which to derive diagram connections.'),
  diagramElements: z
    .array(z.string())
    .describe('The existing diagram elements to connect.'),
});
export type SuggestDiagramConnectionsInput = z.infer<
  typeof SuggestDiagramConnectionsInputSchema
>;

const SuggestDiagramConnectionsOutputSchema = z.object({
  connections: z
    .array(z.object({source: z.string(), target: z.string()}))
    .describe('Suggested connections between diagram elements.'),
});
export type SuggestDiagramConnectionsOutput = z.infer<
  typeof SuggestDiagramConnectionsOutputSchema
>;

export async function suggestDiagramConnections(
  input: SuggestDiagramConnectionsInput
): Promise<SuggestDiagramConnectionsOutput> {
  return suggestDiagramConnectionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDiagramConnectionsPrompt',
  input: {schema: SuggestDiagramConnectionsInputSchema},
  output: {schema: SuggestDiagramConnectionsOutputSchema},
  prompt: `You are an AI assistant specialized in suggesting connections between diagram elements based on the content of the notes provided. Analyze the notes and suggest connections between the diagram elements to create a coherent diagram.

Notes: {{{notes}}}

Diagram Elements: {{{diagramElements}}}

Suggest connections between these elements based on the notes. The output should be a JSON array of objects, where each object represents a connection and includes the source and target element.

Example:
[{
"source": "element1",
"target": "element2"
}]
`,
});

const suggestDiagramConnectionsFlow = ai.defineFlow(
  {
    name: 'suggestDiagramConnectionsFlow',
    inputSchema: SuggestDiagramConnectionsInputSchema,
    outputSchema: SuggestDiagramConnectionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
