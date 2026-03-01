
import React from 'react';
import { SeverityResult } from '../types';
import { getSelfCareTips } from '../services/severity';

interface SeverityBannerProps {
    result: SeverityResult;
    symptoms: string[];
    onBookAppointment: () => void;
    onEmergency: () => void;
    onDismiss: () => void;
}

const SeverityBanner: React.FC<SeverityBannerProps> = ({
    result, symptoms, onBookAppointment, onEmergency, onDismiss,
}) => {
    const tips = result.action === 'self_care' ? getSelfCareTips(symptoms) : [];

    const colorMap = {
        mild: { border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-400', btn: 'bg-emerald-500 hover:bg-emerald-600' },
        moderate: { border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-400', btn: 'bg-amber-500 hover:bg-amber-600' },
        severe: { border: 'border-red-200 dark:border-red-800', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-400', bar: 'bg-red-500', btn: 'bg-red-500 hover:bg-red-600' },
    };
    const c = colorMap[result.level];

    return (
        <div className={`rounded-2xl border ${c.border} ${c.bg} p-5 space-y-4`}>
            <div className="flex items-start justify-between">
                <div>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>
                        {result.level === 'mild' ? '✅ Mild' : result.level === 'moderate' ? '⚠️ Moderate' : '🚨 Severe'}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">{result.message}</p>
                </div>
                <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-3 text-lg leading-none">×</button>
            </div>

            <div>
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
                    <span>Severity</span>
                    <span>{result.score}/10</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                        className={`h-1.5 rounded-full transition-all duration-700 ${c.bar}`}
                        style={{ width: `${(result.score / 10) * 100}%` }}
                    />
                </div>
            </div>

            {result.action === 'self_care' && tips.length > 0 && (
                <div>
                    <div className="text-xs font-medium text-emerald-500 mb-2">💊 Self-Care Tips</div>
                    <ul className="space-y-1">
                        {tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <span className="text-emerald-400 mt-0.5">•</span>
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex gap-2">
                {result.action === 'emergency' && (
                    <button onClick={onEmergency} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">
                        📞 Call Emergency
                    </button>
                )}
                {result.action === 'book_appointment' && (
                    <button onClick={onBookAppointment} className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors">
                        📅 Book Consultation
                    </button>
                )}
                {result.action === 'self_care' && (
                    <button onClick={onDismiss} className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors">
                        Got it
                    </button>
                )}
            </div>
        </div>
    );
};

export default SeverityBanner;
