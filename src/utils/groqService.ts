import { Message } from '../types/character';

export class GroqService {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getChatResponse(messages: Message[], characterContext: string): Promise<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: characterContext },
            ...messages
          ],
          model: 'mixtral-8x7b-32768',
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('Error getting chat response:', error);
      return 'Sorry, there was an error processing your request.';
    }
  }
} 