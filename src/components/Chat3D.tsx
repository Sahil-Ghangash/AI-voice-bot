"use client"
import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations, Environment, ContactShadows, Sparkles } from '@react-three/drei';
import { SpeechService } from '../utils/speechService';
import { GroqService } from '../utils/groqService';
import { characterConfig } from '../config/character';
import * as THREE from 'three';

function AnimeCharacter({ isSpeaking, text, speechProgress }: { isSpeaking: boolean; text: string; speechProgress: number }) {
    const group = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF('/65a8dba831b23abb4f401bae.glb');
    const { actions } = useAnimations(animations, group);
    const { camera } = useThree();
    const mesh = scene.children[0] as THREE.Mesh & { 
      morphTargetDictionary?: { [key: string]: number };
      morphTargetInfluences?: number[];
    };
  
    // Store references to bones for animation
    const bonesRef = useRef<{
      leftArm?: THREE.Object3D;
      rightArm?: THREE.Object3D;
      leftForeArm?: THREE.Object3D;
      rightForeArm?: THREE.Object3D;
      leftHand?: THREE.Object3D;
      rightHand?: THREE.Object3D;
      head?: THREE.Object3D;
    }>({});
  
    // Viseme references for mouth movement
    const visemes = {
      'A': mesh.morphTargetDictionary?.['viseme_A'] ?? 0,
      'E': mesh.morphTargetDictionary?.['viseme_E'] ?? 0,
      'I': mesh.morphTargetDictionary?.['viseme_I'] ?? 0,
      'O': mesh.morphTargetDictionary?.['viseme_O'] ?? 0,
      'U': mesh.morphTargetDictionary?.['viseme_U'] ?? 0,
    };
  
    // Animation settings
    const mouthOpenValue = useRef(0);
    const speakingIntensity = useRef(0);
    const gesturePhase = useRef(0);
  
    // Find all necessary bones when the scene loads
    useEffect(() => {
      // Log all available bones for debugging
      console.log("All scene objects:", scene.children.map(child => child.name));
      
      // Traverse the scene to find bones by name pattern
      scene.traverse((object) => {
        if (object.name.includes('mixamorig')) {
          console.log("Found bone:", object.name);
        }
      });
      
      // Find the relevant bones
      bonesRef.current = {
        head: scene.getObjectByName('mixamorigHead'),
        leftArm: scene.getObjectByName('mixamorigLeftArm'),
        rightArm: scene.getObjectByName('mixamorigRightArm'),
        leftForeArm: scene.getObjectByName('mixamorigLeftForeArm'),
        rightForeArm: scene.getObjectByName('mixamorigRightForeArm'),
        leftHand: scene.getObjectByName('mixamorigLeftHand'),
        rightHand: scene.getObjectByName('mixamorigRightHand')
      };
  
      // Log the bones found
      console.log("Bones found:", Object.keys(bonesRef.current).filter(key => bonesRef.current[key as keyof typeof bonesRef.current]));
    }, [scene]);
  
    // Handle mouth movement for speaking
    useEffect(() => {
      if (isSpeaking && text) {
        // Simple approximation of syllables
        const syllableDuration = 0.15;
        speakingIntensity.current = 1.0; // Full intensity when speaking
        
        // Reset mouth state when done speaking
        return () => {
          if (mesh.morphTargetInfluences) {
            Object.values(visemes).forEach((idx) => {
              if (typeof idx === 'number' && mesh.morphTargetInfluences) {
                mesh.morphTargetInfluences[idx] = 0;
              }
            });
          }
          speakingIntensity.current = 0;
        };
      }
    }, [isSpeaking, text]);
  
    // Frame-by-frame animation
    useFrame((state) => {
      const time = state.clock.getElapsedTime();
      
      // Make sure the group reference exists
      if (group.current) {
        // Subtle breathing and idle movement
        group.current.position.y = Math.sin(time * 1.5) * 0.01;
        
        // Handle speaking animation
        if (isSpeaking) {
          // Head movement during speech
          if (bonesRef.current.head) {
            const headTilt = Math.sin(time * 2) * 0.1;
            const headTurn = Math.sin(time * 1.5) * 0.15;
            bonesRef.current.head.rotation.y = headTurn;
            bonesRef.current.head.rotation.z = headTilt * 0.3;
          }
          
          // Animate speaking gestures with arms
          gesturePhase.current = time % 6; // 6-second gesture cycle
          const gestureProgress = gesturePhase.current / 6;
          
          // Arms and hands expressively move during key parts of speech
          if (gestureProgress < 0.3) {
            // Gesture phase 1: Right arm moves slightly outward
            if (bonesRef.current.rightArm && bonesRef.current.rightForeArm) {
              const intensity = Math.sin(gestureProgress * Math.PI / 0.3) * 0.2;
              bonesRef.current.rightArm.rotation.z = -0.7 - intensity;
              bonesRef.current.rightForeArm.rotation.z = -0.3 - intensity * 0.5;
            }
          } else if (gestureProgress < 0.6) {
            // Gesture phase 2: Left arm moves slightly
            if (bonesRef.current.leftArm && bonesRef.current.leftForeArm) {
              const subPhase = (gestureProgress - 0.3) / 0.3;
              const intensity = Math.sin(subPhase * Math.PI) * 0.2;
              bonesRef.current.leftArm.rotation.z = 0.7 + intensity;
              bonesRef.current.leftForeArm.rotation.z = 0.3 + intensity * 0.5;
            }
          } else {
            // Return to neutral crossed position
            // setCrossedArmsPose();
          }
          
          // Mouth animation
          if (mesh.morphTargetInfluences) {
            console.log( mesh.morphTargetInfluences, "snith")
            // Calculate a cyclic mouth pattern
            const mouthCycle = time * 8; // Speed of mouth movement
            const vowelIndex = Math.floor(mouthCycle % 5); // 5 vowel positions
            
            // Reset all visemes
            Object.values(visemes).forEach((idx) => {
              if (typeof idx === 'number' && mesh.morphTargetInfluences) {
                mesh.morphTargetInfluences[idx] = 0;
              }
            });
            
            // Select current viseme
            const vowels = ['A', 'E', 'I', 'O', 'U'] as const;
            const currentVowel = vowels[vowelIndex];
            const visemeIndex = visemes[currentVowel];
            
            // Apply with intensity that varies naturally
            const intensity = (Math.sin(mouthCycle * Math.PI) + 1) * 0.5 * 0.8;
            if (typeof visemeIndex === 'number') {
              mesh.morphTargetInfluences[visemeIndex] = intensity;
            }
            
            // Periodically close mouth between syllables
            if (Math.sin(mouthCycle * 0.5) < -0.8) {
              Object.values(visemes).forEach((idx) => {
                if (typeof idx === 'number' && mesh.morphTargetInfluences) {
                  mesh.morphTargetInfluences[idx] = 0;
                }
              });
            }
          }
        } else {
          // Idle animation - subtle movement when not speaking
          if (bonesRef.current.head) {
            // Occasional subtle head movement
            const slowNod = Math.sin(time * 0.5) * 0.02;
            bonesRef.current.head.rotation.x = slowNod;
          }
          
          // Close mouth when not speaking
          if (mesh.morphTargetInfluences) {
            Object.values(visemes).forEach((idx) => {
              if (typeof idx === 'number' && mesh.morphTargetInfluences) {
                mesh.morphTargetInfluences[idx] = 0;
              }
            });
          }
        }
      }
    });
  
    // Log when speaking state changes
    useEffect(() => {
      console.log("Speaking state:", isSpeaking);
      console.log("Current text:", text?.substring(0, 20));
    }, [isSpeaking, text]);
  
    return (
      <group ref={group}>
        <primitive object={scene} scale={1} position={[0, -1, 0]} />
        
        {/* Visual indicator when speaking */}
        {isSpeaking && (
          <group position={[0, 1.5, 0]}>
            <Sparkles 
              count={20} 
              scale={1.5} 
              size={2} 
              speed={0.4} 
              color="#4f46e5"
            />
            <pointLight
              color="#4f46e5"
              intensity={2}
              distance={3}
              decay={2}
            />
          </group>
        )}
      </group>
    );
  }

export default function Chat3D() {
  const [messages, setMessages] = useState<Array<{
    content: string;
    sender: 'user' | 'bot';
  }>>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechService] = useState(new SpeechService(process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!));
  const groqService = new GroqService(process.env.NEXT_PUBLIC_GROQ_API_KEY!);
  const [currentText, setCurrentText] = useState('');
  const [speechProgress, setSpeechProgress] = useState(0);

  const handleSendMessage = async (content: string) => {
    try {
      setMessages(prev => [...prev, { content, sender: 'user' }]);
      
      const apiMessages = [{ role: 'user' as const, content }];
      const response = await groqService.getChatResponse(apiMessages, characterConfig.context);
      
      setIsSpeaking(true);
      setCurrentText(response);
      
      const audioPromise = speechService.prepareAudio(response);
      setMessages(prev => [...prev, { content: response, sender: 'bot' }]);
      
      await audioPromise;
      await speechService.playAudio();
      
      setIsSpeaking(false);
      setCurrentText('');
    } catch (error) {
      console.error('Error:', error);
      setIsSpeaking(false);
      setCurrentText('');
    }
  };

  return (
    <div className="relative h-screen w-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black overflow-hidden">
      <Canvas shadows camera={{ position: [0, 1.5, 2.5], fov: 50 }}>
        <Environment preset="sunset" />
        <fog attach="fog" args={['#000', 3, 10]} />
        
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        
        <AnimeCharacter isSpeaking={isSpeaking} text={currentText} speechProgress={speechProgress} />
        
        <ContactShadows
          opacity={0.5}
          scale={10}
          blur={1}
          far={10}
          resolution={256}
          color="#000000"
        />
        
        <OrbitControls
          enableZoom={false}
          minPolarAngle={Math.PI / 2.2}
          maxPolarAngle={Math.PI / 1.8}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
        />
      </Canvas>

      {/* Chat Messages */}
      <div className="absolute top-0 left-0 right-0 max-h-[60vh] overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] p-4 rounded-2xl backdrop-blur-lg
                ${message.sender === 'user'
                  ? 'bg-indigo-500/30 ml-auto rounded-tr-none'
                  : 'bg-purple-500/30 mr-auto rounded-tl-none'
                }
                border border-white/10
                shadow-[0_0_15px_rgba(139,92,246,0.2)]
                animate-fade-in
              `}
            >
              <div className="text-white text-lg">
                {message.content}
              </div>
              
              {message.sender === 'bot' && isSpeaking && (
                <div className="flex gap-1 mt-2 h-1">
                  <div className="flex-1 bg-white/30 rounded-full animate-pulse" />
                  <div className="flex-1 bg-white/30 rounded-full animate-pulse [animation-delay:0.2s]" />
                  <div className="flex-1 bg-white/30 rounded-full animate-pulse [animation-delay:0.4s]" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Control button */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
        <button
          onClick={() => {
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
          }}
          className={`
            px-8 py-4 rounded-full font-semibold text-white
            transition-all duration-300 transform-gpu
            ${isListening 
              ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse' 
              : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105'
            }
            shadow-[0_0_20px_rgba(99,102,241,0.3)]
            hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]
            text-lg
          `}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>
    </div>
  );
}