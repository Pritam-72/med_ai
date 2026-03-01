
import React from 'react';
import { ELEVENLABS_VOICES, ElevenLabsVoice } from '../services/elevenlabs';

interface VoiceSelectorProps {
    selectedVoiceId: string;
    onVoiceChange: (voiceId: string) => void;
    disabled?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoiceId, onVoiceChange, disabled }) => {
    const selectedVoice = ELEVENLABS_VOICES.find(v => v.voice_id === selectedVoiceId);

    return (
        <div className="glass-panel border-white/20 dark:border-gray-800/30 rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 p-5">
            <div className="flex items-center space-x-2 mb-3">
                <div className="w-7 h-7 bg-purple-50 dark:bg-purple-950/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.536 8.464a5 5 0 010 7.072M12 6v12M9.172 9.172a4 4 0 000 5.656M6.343 6.343a8 8 0 000 11.314" />
                    </svg>
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">AI Voice</h4>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">ElevenLabs</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
                {ELEVENLABS_VOICES.map((voice) => (
                    <button
                        key={voice.voice_id}
                        onClick={() => !disabled && onVoiceChange(voice.voice_id)}
                        disabled={disabled}
                        className={`text-left px-3 py-2.5 rounded-xl border transition-all text-xs ${selectedVoiceId === voice.voice_id
                            ? 'bg-gradient-to-r from-purple-500/10 to-transparent border-purple-400/50 shadow-sm'
                            : 'border-white/40 dark:border-gray-700/50 hover:border-purple-300/50 dark:hover:border-purple-700/50 hover:bg-white/50 dark:hover:bg-gray-800/50'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <div className="flex items-center space-x-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${selectedVoiceId === voice.voice_id
                                ? 'bg-gradient-to-br from-purple-400 to-indigo-500 text-white shadow-sm'
                                : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500'
                                }`}>
                                {voice.name[0]}
                            </div>
                            <div>
                                <p className={`font-medium ${selectedVoiceId === voice.voice_id ? 'text-purple-600 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {voice.name}
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{voice.description}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
            {disabled && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">Cannot change during an active call</p>
            )}
        </div>
    );
};

export default VoiceSelector;
