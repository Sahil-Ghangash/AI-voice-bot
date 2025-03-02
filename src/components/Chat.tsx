"use client"

import { useState, useEffect, useRef } from 'react';
import { SpeechService } from '../utils/speechService';
import { GroqService } from '../utils/groqService';
import { characterConfig } from '../config/character';
import { Message } from '../types/character';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [energy, setEnergy] = useState(100);
  const orbitRef = useRef<HTMLDivElement>(null);
  const [speechService] = useState(new SpeechService(process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!));
  const groqService = new GroqService(process.env.NEXT_PUBLIC_GROQ_API_KEY!);

  useEffect(() => {
    if (orbitRef.current) {
      const particles = Array.from({ length: 12 }).map(() => {
        const particle = document.createElement('div');
        particle.className = 'particle';
        orbitRef.current?.appendChild(particle);
        return particle;
      });

      let angle = 0;
      const animate = () => {
        particles.forEach((particle, i) => {
          const offset = (i / particles.length) * Math.PI * 2;
          const x = Math.cos(angle + offset) * 60;
          const y = Math.sin(angle + offset) * 60;
          particle.style.transform = `translate(${x}px, ${y}px)`;
        });
        angle += 0.02;
        requestAnimationFrame(animate);
      };
      animate();
    }
  }, []);

  const handleSendMessage = async (content: string) => {
    setEnergy(prev => Math.max(0, prev - 10));
    const newMessages = [...messages, { role: 'user' as const, content }];
    setMessages(newMessages);
    setIsSpeaking(true);

    try {
      // Get response from Groq
      const response = await groqService.getChatResponse(newMessages, characterConfig.context);
      
      // Start speaking and wait for audio to begin
      const audioPromise = speechService.speak(response);
      
      // Small delay to ensure audio has started
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now show the message
      const assistantMessage = { role: 'assistant' as const, content: response };
      setMessages([...newMessages, assistantMessage]);
      
      // Wait for audio to complete
      await audioPromise;
      setIsSpeaking(false);
      setEnergy(prev => Math.min(100, prev + 20));
    } catch (error) {
      console.error('Error in message handling:', error);
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (!isListening) {
      setIsListening(true);
      speechService.startListening((text) => {
        handleSendMessage(text);
        setIsListening(false);
      });
    } else {
      setIsListening(false);
      speechService.stopListening();
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      <div className="absolute inset-0 bg-gradient-radial from-purple-900/20 via-transparent to-transparent" />
      
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 z-10">
        {messages.map((message, index) => (
          <div key={index} 
               className={`relative group transition-all duration-300 ${
                 message.role === 'user' ? 'ml-auto' : ''
               }`}>
            <div className={`p-4 max-w-[80%] rounded-2xl backdrop-blur-lg 
                           ${message.role === 'user' 
                             ? 'bg-blue-500/20 border border-blue-500/30' 
                             : 'bg-purple-500/20 border border-purple-500/30'
                           } text-white shadow-glow`}>
              {message.content}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                          translate-x-[-100%] group-hover:translate-x-[100%] duration-1000 transition-transform" />
          </div>
        ))}
      </div>

      {/* AI Core */}
      <div className="relative flex flex-col items-center mb-20">
        <div ref={orbitRef} className="relative w-40 h-40">
          {/* Core Sphere */}
          <div className={`absolute inset-0 m-auto w-20 h-20 rounded-full 
                          bg-gradient-to-br from-blue-500 to-purple-500
                          shadow-[0_0_50px_rgba(139,92,246,0.5)]
                          ${isListening ? 'animate-pulse-fast' : ''}
                          ${isSpeaking ? 'animate-bounce-gentle' : ''}`}>
            {/* Energy Meter */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute bottom-0 w-full bg-white/30 transition-all duration-300"
                   style={{ height: `${energy}%` }} />
            </div>
            
            {/* Audio Visualizer */}
            <div className="absolute inset-0 flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}
                     className="w-1 bg-white rounded-full transform-gpu transition-all duration-200"
                     style={{
                       height: `${(isSpeaking || isListening) ? 
                         Math.random() * 16 + 4 : 8}px`,
                       animation: `wave ${0.5 + i * 0.1}s ease-in-out infinite`
                     }} />
              ))}
            </div>
          </div>
        </div>

        {/* Control Button */}
        <button
          onClick={toggleListening}
          className={`mt-8 px-6 py-3 rounded-full font-semibold text-white
                     transition-all duration-300 transform-gpu
                     ${isListening 
                       ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse' 
                       : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:scale-105'
                     }
                     shadow-[0_0_20px_rgba(139,92,246,0.3)]
                     hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]`}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>
    </div>
  );
} 