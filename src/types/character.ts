export interface Character {
  name: string;
  personality: string;
  voice: {
    name: string;
    language: string;
    pitch: number;
    rate: number;
  };
  context: string;
}

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};