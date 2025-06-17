'use server';

/**
 * @fileOverview A flow for chatting with an AI assistant.
 *
 * - aiChatBot - A function that handles the AI chat process.
 * - AiChatBotInput - The input type for the aiChatBot function.
 * - AiChatBotOutput - The return type for the aiChatBot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiChatBotInputSchema = z.object({
  message: z.string().describe('The message to send to the AI assistant.'),
});
export type AiChatBotInput = z.infer<typeof AiChatBotInputSchema>;

const AiChatBotOutputSchema = z.object({
  response: z.string().describe('The AI assistant\'s response.'),
});
export type AiChatBotOutput = z.infer<typeof AiChatBotOutputSchema>;

export async function aiChatBot(input: AiChatBotInput): Promise<AiChatBotOutput> {
  return aiChatBotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiChatBotPrompt',
  input: {schema: AiChatBotInputSchema},
  output: {schema: AiChatBotOutputSchema},
  prompt: `You are a helpful AI assistant. Respond to the user's message:

Message: {{{message}}}`,
});

const aiChatBotFlow = ai.defineFlow(
  {
    name: 'aiChatBotFlow',
    inputSchema: AiChatBotInputSchema,
    outputSchema: AiChatBotOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
