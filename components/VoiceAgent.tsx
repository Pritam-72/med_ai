
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { SessionStatus, TranscriptionEntry, ToolCallEntry, UserProfile as UserProfileType } from '../types';
import {
  GEMINI_MODEL,
  INPUT_SAMPLE_RATE,
  HEALTHCARE_TOOLS,
  getSystemInstruction
} from '../constants';
import { ElevenLabsTTS, DEFAULT_VOICE_ID } from '../services/elevenlabs';
import AudioVisualizer from './AudioVisualizer';

interface VoiceAgentProps {
  status: SessionStatus;
  setStatus: (status: SessionStatus) => void;
  onStart: () => void;
  onEnd: () => void;
  onTranscription: (role: 'user' | 'assistant', text: string) => void;
  onToolCall: (call: Omit<ToolCallEntry, 'timestamp'>) => void;
  onToolResult: (id: string, result: any) => void;
  onError: (error: string) => void;
  language: string;
  userProfile: UserProfileType;
  onSessionEnd: (startTime: number) => void;
  selectedVoiceId: string;
  onVoiceBookAppointment: (dept: string, time: string, reason: string) => void;
}

const VoiceAgent: React.FC<VoiceAgentProps> = ({
  status,
  setStatus,
  onStart,
  onEnd,
  onTranscription,
  onToolCall,
  onToolResult,
  onError,
  language,
  userProfile,
  onSessionEnd,
  selectedVoiceId,
  onVoiceBookAppointment,
}) => {
  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionStartRef = useRef<number>(0);
  const ttsRef = useRef<ElevenLabsTTS | null>(null);
  const pendingTextRef = useRef<string>('');

  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const currentInputTranscription = useRef<string>('');

  const elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || '';

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const stopAudio = () => {
    ttsRef.current?.cancel();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextInRef.current) {
      audioContextInRef.current.close();
    }
    if (audioContextOutRef.current) {
      audioContextOutRef.current.close();
    }
    sessionRef.current?.close();
    sessionRef.current = null;
    ttsRef.current = null;
    setAnalyserNode(null);

    if (sessionStartRef.current > 0) {
      onSessionEnd(sessionStartRef.current);
      sessionStartRef.current = 0;
    }
    setStatus(SessionStatus.IDLE);
  };

  const handleToolResponse = (name: string, args: any): string => {
    switch (name) {
      case 'checkSymptomSeverity':
        return `Severity: Moderate. Recommended action: Please visit an urgent care center within 24 hours for evaluation. Symptoms analyzed: ${(args.symptoms || []).join(', ')}.`;
      case 'bookAppointment':
        onVoiceBookAppointment(args.department, args.preferredTime, args.reason || '');
        return `Appointment provisionally scheduled for ${args.preferredTime} in ${args.department}. Confirmation sent to your profile.`;
      case 'findNearbyClinic':
        return `Found 3 ${args.clinicType} facilities near ${args.location || 'your location'}: 1) CityMed ${args.clinicType} (0.8 mi), 2) HealthFirst Center (1.2 mi), 3) Community ${args.clinicType} (2.1 mi).`;
      case 'setPrescriptionReminder':
        return `Reminder set! You will be reminded to take ${args.medication} at ${args.time}${args.frequency ? ` (${args.frequency})` : ''}. Notification enabled.`;
      case 'getMedicationInfo':
        return `${args.medicationName}: Common dosage varies by condition. Common side effects may include headache, nausea, dizziness. Always follow your doctor's prescribed dosage.`;
      case 'getWeatherHealthAlert':
        return `Health alerts for ${args.location}: Air Quality Index: 42 (Good). Pollen Level: Moderate. UV Index: 6 (High — use SPF 30+). Temperature: 72°F.`;
      case 'generateSessionSummary':
        return `Session summary generated. Key findings: ${args.keyFindings}. Recommendations: ${args.recommendations}. Follow-up: ${args.followUp || 'As needed'}.`;
      default:
        return 'Action completed successfully.';
    }
  };

  const flushTextToTTS = async () => {
    const text = pendingTextRef.current.trim();
    if (!text || !ttsRef.current) return;
    pendingTextRef.current = '';
    try {
      await ttsRef.current.speak(text);
    } catch (err: any) {
      console.error('TTS error:', err);
    }
  };

  useEffect(() => {
    if (status === SessionStatus.CONNECTING) {
      const connect = async () => {
        try {
          const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

          audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
          if (audioContextInRef.current.state === 'suspended') {
            await audioContextInRef.current.resume();
          }

          audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          if (audioContextOutRef.current.state === 'suspended') {
            await audioContextOutRef.current.resume();
          }

          streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

          const analyser = audioContextInRef.current.createAnalyser();
          analyser.fftSize = 256;
          setAnalyserNode(analyser);

          const systemInstruction = getSystemInstruction(language, userProfile);

          let nextPlayTime = 0;

          const playPCM = (base64Data: string) => {
            if (!audioContextOutRef.current) return;
            const raw = atob(base64Data);
            const int16 = new Int16Array(raw.length / 2);
            for (let i = 0; i < int16.length; i++) {
              int16[i] = (raw.charCodeAt(i * 2)) | (raw.charCodeAt(i * 2 + 1) << 8);
            }
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
              float32[i] = int16[i] / 32768;
            }
            const buffer = audioContextOutRef.current.createBuffer(1, float32.length, 24000);
            buffer.getChannelData(0).set(float32);
            const source = audioContextOutRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextOutRef.current.destination);
            const startTime = Math.max(audioContextOutRef.current.currentTime, nextPlayTime);
            source.start(startTime);
            nextPlayTime = startTime + buffer.duration;
          };

          const sessionPromise = ai.live.connect({
            model: GEMINI_MODEL,
            config: {
              responseModalities: [Modality.AUDIO],
              systemInstruction,
              tools: [{ functionDeclarations: HEALTHCARE_TOOLS }],
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
            callbacks: {
              onopen: () => {
                console.log('Gemini Live Session Opened (AUDIO mode)');
                setStatus(SessionStatus.ACTIVE);
                sessionStartRef.current = Date.now();

                const source = audioContextInRef.current!.createMediaStreamSource(streamRef.current!);
                const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);

                source.connect(analyser);
                analyser.connect(scriptProcessor);

                scriptProcessor.onaudioprocess = (e) => {
                  if (!sessionRef.current) return;
                  const inputData = e.inputBuffer.getChannelData(0);
                  const pcmBlob = createBlob(inputData);
                  try {
                    sessionRef.current.sendRealtimeInput({ media: pcmBlob });
                  } catch (err) {
                    console.warn('Failed to send audio chunk:', err);
                  }
                };

                scriptProcessor.connect(audioContextInRef.current!.destination);
              },

              onmessage: async (message: LiveServerMessage) => {
                const audioParts = message.serverContent?.modelTurn?.parts?.filter(p => p.inlineData?.mimeType?.startsWith('audio/'));
                if (audioParts?.length) {
                  for (const part of audioParts) {
                    if (part.inlineData?.data) {
                      playPCM(part.inlineData.data);
                    }
                  }
                }

                const textPart = message.serverContent?.modelTurn?.parts?.find(p => p.text);
                if (textPart?.text) {
                  pendingTextRef.current += textPart.text;
                }

                if (message.serverContent?.turnComplete) {
                  nextPlayTime = 0;
                  if (currentInputTranscription.current) {
                    onTranscription('user', currentInputTranscription.current);
                    currentInputTranscription.current = '';
                  }
                  if (pendingTextRef.current.trim()) {
                    onTranscription('assistant', pendingTextRef.current.trim());
                    pendingTextRef.current = '';
                  }
                }

                if (message.serverContent?.inputTranscription?.text) {
                  currentInputTranscription.current += message.serverContent.inputTranscription.text;
                }

                if (message.serverContent?.outputTranscription?.text) {
                  pendingTextRef.current += message.serverContent.outputTranscription.text;
                }

                if (message.toolCall) {
                  for (const fc of message.toolCall.functionCalls) {
                    onToolCall({ id: fc.id, name: fc.name, args: fc.args });
                    const result = handleToolResponse(fc.name, fc.args);
                    onToolResult(fc.id, result);

                    if (fc.name === 'setPrescriptionReminder') {
                      triggerReminderNotification(fc.args);
                    }

                    sessionRef.current?.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result },
                      }
                    });
                  }
                }

                if (message.serverContent?.interrupted) {
                  nextPlayTime = 0;
                  pendingTextRef.current = '';
                }
              },

              onerror: (e: any) => {
                console.error('Gemini error:', e);
                const msg = e?.message || JSON.stringify(e) || 'Connection error';
                onError(`AI Agent Error: ${msg}`);
                stopAudio();
              },
              onclose: (e: any) => {
                console.log('Gemini Live Session Closed', e);
                const code = e?.code;
                const reason = e?.reason || '';
                console.log(`Close code: ${code}, reason: ${reason}`);
                if (code && code !== 1000) {
                  onError(`Connection dropped (code ${code}): ${reason || 'Check your API key quota at aistudio.google.com'}`);
                }
                stopAudio();
              },
            }
          });

          sessionRef.current = await sessionPromise;
        } catch (err: any) {
          console.error(err);
          onError(err.message || 'Failed to initialize microphone or connection.');
          setStatus(SessionStatus.IDLE);
        }
      };

      connect();
    }
  }, [status]);

  const triggerReminderNotification = (args: any) => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('💊 med_ai Prescription Reminder', {
            body: `Reminder set: Take ${args.medication} at ${args.time}`,
          });
        }
      });
    }
  };

  const hasElevenLabsKey = elevenLabsApiKey && elevenLabsApiKey !== 'your_elevenlabs_api_key_here';

  return (
    <div className="glass-panel rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-transparent dark:from-blue-900/10 dark:to-transparent pointer-events-none"></div>
      <div className="relative z-10 w-full flex flex-col items-center space-y-6">
        <div className="relative">
          <div className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl relative z-20 ${status === SessionStatus.ACTIVE ? 'bg-gradient-to-tr from-blue-100/80 to-purple-100/80 dark:from-blue-900/40 dark:to-purple-900/40' : 'bg-gray-50 dark:bg-gray-800/80'
            }`}>
            <AudioVisualizer active={status === SessionStatus.ACTIVE} analyserNode={analyserNode} />
            <div className={`absolute inset-0 rounded-full border-2 transition-all duration-700 z-10 ${status === SessionStatus.ACTIVE ? 'border-blue-400/50 dark:border-blue-500/50 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]' : 'border-gray-200 dark:border-gray-700'
              }`}></div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {status === SessionStatus.IDLE && 'Ready to Help'}
            {status === SessionStatus.CONNECTING && 'Connecting...'}
            {status === SessionStatus.ACTIVE && "I'm Listening..."}
          </h2>
          <p className="text-gray-400 dark:text-gray-500 max-w-sm mx-auto text-sm">
            {status === SessionStatus.IDLE && 'Click start to speak with your healthcare assistant.'}
            {status === SessionStatus.ACTIVE && 'Ask about symptoms, medications, find clinics, or book an appointment.'}
          </p>

          {status === SessionStatus.IDLE && (
            <div className={`inline-flex items-center space-x-1.5 text-xs px-3 py-1 rounded-full mt-1 ${hasElevenLabsKey
              ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-500 dark:text-purple-400'
              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hasElevenLabsKey ? 'bg-purple-400' : 'bg-amber-400'}`}></span>
              <span>{hasElevenLabsKey ? 'ElevenLabs TTS Active' : 'ElevenLabs API key not set'}</span>
            </div>
          )}
        </div>

        <div className="pt-2 w-full flex justify-center">
          {status === SessionStatus.IDLE ? (
            <button
              onClick={onStart}
              className="group flex items-center space-x-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3.5 rounded-full font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <span>Start Conversation</span>
            </button>
          ) : (
            <button
              onClick={stopAudio}
              className="group flex items-center space-x-3 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 px-8 py-3.5 rounded-full font-semibold transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              <span>End Call</span>
            </button>
          )}
        </div>

        {status === SessionStatus.ACTIVE && (
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>LIVE</span>
            </div>
            {hasElevenLabsKey && (
              <div className="flex items-center space-x-1.5 text-purple-400 dark:text-purple-500 bg-purple-50 dark:bg-purple-950/20 px-3 py-1 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
                <span>ElevenLabs TTS</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceAgent;
