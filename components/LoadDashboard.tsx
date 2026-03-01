
import React, { useMemo } from 'react';
import { predictLoad } from '../services/capacity';

interface LoadDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

const RISK_COLORS = {
    low: { bar: 'bg-emerald-400', text: 'text-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500' },
    normal: { bar: 'bg-blue-400', text: 'text-blue-500', badge: 'bg-blue-50 dark:bg-blue-950/20 text-blue-500' },
    high: { bar: 'bg-amber-400', text: 'text-amber-500', badge: 'bg-amber-50 dark:bg-amber-950/20 text-amber-500' },
    critical: { bar: 'bg-red-500', text: 'text-red-500', badge: 'bg-red-50 dark:bg-red-950/20 text-red-500' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LoadDashboard: React.FC<LoadDashboardProps> = ({ isOpen, onClose }) => {
    const predictions = useMemo(() => predictLoad(14), []);

    if (!isOpen) return null;

    const maxLoad = Math.max(...predictions.map(p => p.expected), 1);
    const avgLoad = Math.round(predictions.reduce((a, p) => a + p.expected, 0) / predictions.length);
    const highRiskDays = predictions.filter(p => p.risk === 'high' || p.risk === 'critical').length;
    const busiest = predictions.reduce((a, b) => a.expected > b.expected ? a : b);

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">📊 Load Dashboard</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500">14-day patient load forecast</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">×</button>
                </div>

                <div className="grid grid-cols-3 gap-3 p-5">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                        <div className="text-xl font-semibold text-blue-500">{avgLoad}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">Avg/Day</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                        <div className={`text-xl font-semibold ${highRiskDays > 3 ? 'text-red-500' : 'text-amber-500'}`}>{highRiskDays}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">High-Risk</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                        <div className="text-xl font-semibold text-purple-500">{Math.ceil(avgLoad / 20)}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">Doctors</div>
                    </div>
                </div>

                <div className="px-5 pb-3">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">📈 Forecast</div>
                    <div className="space-y-1.5">
                        {predictions.map(p => {
                            const d = new Date(p.date);
                            const dayName = DAY_NAMES[d.getDay()];
                            const pct = (p.expected / maxLoad) * 100;
                            const c = RISK_COLORS[p.risk];
                            return (
                                <div key={p.date} className="flex items-center gap-3">
                                    <div className="w-8 text-right text-xs text-gray-400 dark:text-gray-500 shrink-0">{dayName}</div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500 w-16 shrink-0">{p.date.slice(5)}</div>
                                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`h-3 rounded-full transition-all duration-700 ${c.bar}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs font-semibold w-6 text-right ${c.text}`}>{p.expected}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-lg w-14 text-center font-medium ${c.badge}`}>{p.risk}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 dark:border-gray-800 space-y-3">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">🧑‍⚕️ Staffing</div>
                    {predictions.filter(p => p.risk !== 'low').slice(0, 4).map(p => (
                        <div key={p.date} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                            <div>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{p.date}</span>
                                <span className={`ml-2 text-xs ${RISK_COLORS[p.risk].text}`}>{p.risk.toUpperCase()}</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {Math.ceil(p.expected / 20)} doctors · {Math.round(p.expected * 0.3)} teleconsult
                            </div>
                        </div>
                    ))}

                    <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                        <div className="text-xs font-medium text-blue-500 mb-1.5">⚡ Spike Alert</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Busiest day: <strong className="text-gray-800 dark:text-gray-200">{busiest.date}</strong> with ~{busiest.expected} patients.
                            Ensure {Math.ceil(busiest.expected / 20)} doctors available.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadDashboard;
