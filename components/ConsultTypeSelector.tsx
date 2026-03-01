
import React from 'react';
import { ConsultType } from '../types';

interface ConsultOption {
    type: ConsultType;
    label: string;
    icon: string;
    eta: string;
    description: string;
}

const CONSULT_OPTIONS: ConsultOption[] = [
    {
        type: 'voice',
        label: 'Voice Consult',
        icon: '📞',
        eta: '~15 min wait',
        description: 'Quick audio call with a general physician.',
    },
    {
        type: 'video',
        label: 'Video Consult',
        icon: '📹',
        eta: '~20 min wait',
        description: 'Face-to-face video consultation.',
    },
    {
        type: 'physical',
        label: 'In-Person Visit',
        icon: '🏥',
        eta: 'Next available slot',
        description: 'Physical examination at the clinic.',
    },
];

interface ConsultTypeSelectorProps {
    selected: ConsultType;
    onChange: (type: ConsultType) => void;
    recommendation?: ConsultType;
}

const ConsultTypeSelector: React.FC<ConsultTypeSelectorProps> = ({ selected, onChange, recommendation = 'voice' }) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Consultation Type</label>
                <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-lg">
                    ⭐ {CONSULT_OPTIONS.find(o => o.type === recommendation)?.label}
                </span>
            </div>
            <div className="grid gap-2">
                {CONSULT_OPTIONS.map(opt => (
                    <button
                        key={opt.type}
                        onClick={() => onChange(opt.type)}
                        className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${selected === opt.type
                            ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/20 ring-1 ring-blue-200 dark:ring-blue-800'
                            : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className="text-xl">{opt.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{opt.label}</span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">{opt.eta}</span>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{opt.description}</p>
                            </div>
                            {selected === opt.type && (
                                <span className="text-blue-500 text-base shrink-0">✓</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ConsultTypeSelector;
