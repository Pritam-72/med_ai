
import React, { useState, useEffect } from 'react';
import { FollowUp, Appointment } from '../types';

const STORAGE_KEY = 'med_ai_followups';

function loadFollowUps(): FollowUp[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveFollowUps(list: FollowUp[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

interface FollowUpMonitorProps {
    appointments: Appointment[];
    patientName: string;
}

const FollowUpMonitor: React.FC<FollowUpMonitorProps> = ({ appointments, patientName }) => {
    const [followUps, setFollowUps] = useState<FollowUp[]>(loadFollowUps);
    const [checkInFor, setCheckInFor] = useState<string | null>(null);
    const [checkInText, setCheckInText] = useState('');

    const completedAppts = appointments.filter(a => a.status === 'completed' || a.status === 'upcoming');

    const handleCheckIn = (apptId: string) => {
        if (!checkInText.trim()) return;
        const lower = checkInText.toLowerCase();
        let trend: FollowUp['trend'] = 'stable';
        if (['better', 'improving', 'fine', 'good', 'well', 'recovered'].some(w => lower.includes(w))) trend = 'improving';
        else if (['worse', 'worsening', 'bad', 'terrible', 'more pain', 'severe'].some(w => lower.includes(w))) trend = 'worsening';

        const entry: FollowUp = {
            id: crypto.randomUUID(),
            patientName,
            appointmentId: apptId,
            checkInDate: new Date().toISOString().split('T')[0],
            symptoms: checkInText,
            trend,
            createdAt: Date.now(),
        };
        const updated = [...followUps, entry];
        setFollowUps(updated);
        saveFollowUps(updated);
        setCheckInFor(null);
        setCheckInText('');

        if (trend === 'worsening') {
            setTimeout(() => {
                alert('⚠️ Your symptoms appear to be worsening. We recommend booking a follow-up consultation soon.');
            }, 300);
        }
    };

    const trendColors: Record<FollowUp['trend'], string> = {
        improving: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20',
        stable: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20',
        worsening: 'text-red-500 bg-red-50 dark:bg-red-950/20',
        pending: 'text-gray-400 bg-gray-100 dark:bg-gray-800',
    };

    const trendIcons: Record<FollowUp['trend'], string> = {
        improving: '📈', stable: '➡️', worsening: '📉', pending: '⏳',
    };

    const getFollowUpsForAppt = (id: string) => followUps.filter(f => f.appointmentId === id);

    if (completedAppts.length === 0) return null;

    return (
        <div className="glass-panel border-white/20 dark:border-gray-800/30 rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 p-6 space-y-5">
            <div className="flex items-center gap-2">
                <span className="text-lg">🔄</span>
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Follow-Up Monitor</h3>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg ml-auto">
                    {completedAppts.length} tracked
                </span>
            </div>

            <div className="space-y-3">
                {completedAppts.map(appt => {
                    const apptFollowUps = getFollowUpsForAppt(appt.id);
                    const latest = apptFollowUps[apptFollowUps.length - 1];
                    return (
                        <div key={appt.id} className="border border-white/40 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40 backdrop-blur shadow-sm rounded-2xl p-5 space-y-3 transition-all hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{appt.doctorSpecialty}</div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500">{appt.preferredDate}</div>
                                </div>
                                {latest && (
                                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${trendColors[latest.trend]}`}>
                                        {trendIcons[latest.trend]} {latest.trend}
                                    </span>
                                )}
                            </div>

                            {apptFollowUps.length > 0 && (
                                <div className="space-y-1">
                                    {apptFollowUps.slice(-3).map(fu => (
                                        <div key={fu.id} className="flex items-start gap-2">
                                            <span className={`text-xs px-1.5 py-0.5 rounded-lg ${trendColors[fu.trend]}`}>
                                                {trendIcons[fu.trend]}
                                            </span>
                                            <div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">{fu.symptoms}</div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500">{fu.checkInDate}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {checkInFor === appt.id ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={checkInText}
                                        onChange={e => setCheckInText(e.target.value)}
                                        placeholder="How are you feeling today?"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none h-20 focus:outline-none focus:border-blue-400 transition-colors"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleCheckIn(appt.id)}
                                            className="flex-1 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md active:scale-95"
                                        >
                                            Submit
                                        </button>
                                        <button
                                            onClick={() => setCheckInFor(null)}
                                            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-xl transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setCheckInFor(appt.id)}
                                    className="w-full py-1.5 border border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-500 rounded-xl transition-colors"
                                >
                                    + Daily Check-In
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FollowUpMonitor;
