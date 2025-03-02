declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

// Define proper types instead of any
type SpeechRecognitionEvent = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
};

export class SpeechService {
  private apiKey: string;
  private voiceId: string = 'pNInz6obpgDQGcFmaJgB'; // Example voice ID, you can change this
  private recognition: SpeechRecognition | null = null;
  public audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  public onProgressUpdate: ((progress: number) => void) | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state !== 'suspended') {
        this.audioContext.suspend();
      }
    }
  }

  async prepareAudio(text: string): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
  }

  async playAudio(): Promise<void> {
    if (!this.audioBuffer) return;
    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(this.audioContext.destination);
    source.start(0);

    return new Promise<void>((resolve) => {
      source.onended = () => resolve();
    });
  }

  async speak(text: string) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) throw new Error('Speech generation failed');

      const audioBlob = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      await audio.play();
    } catch (error) {
      console.error('ElevenLabs API error:', error);
      throw error;
    }
  }

  // For speech recognition, we'll still use browser API
  startListening(onResult: (text: string) => void) {
    this.recognition = new (window.webkitSpeechRecognition || window.SpeechRecognition)();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.onresult = (event: any) => onResult(event.results[0][0].transcript);
    this.recognition.start();
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
} 