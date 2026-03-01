import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SlotState {
    time: string;
    booked: boolean;
}

interface DoctorDef {
    id: string;
    name: string;
    initials: string;
    specialty: string;
    color: string;
    maxSlotsPerDay: (day: number) => number;
    emergencyBuffer: number;
    baseBookingRatio: (day: number) => number;
}

const ALL_TIMES = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '02:00 PM',
    '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM',
    '04:30 PM', '05:00 PM',
];

const DOCTORS: DoctorDef[] = [
    {
        id: 'd1', name: 'Dr. Sarah Patel', initials: 'SP',
        specialty: 'General Physician', color: 'from-emerald-400 to-teal-500',
        maxSlotsPerDay: (d) => [0, 17, 17, 17, 17, 17, 0][d] ?? 17,
        baseBookingRatio: (d) => [0, 0.88, 0.75, 0.65, 0.80, 0.70, 0][d] ?? 0.75,
        emergencyBuffer: 3,
    },
    {
        id: 'd2', name: 'Dr. James Chen', initials: 'JC',
        specialty: 'Cardiologist', color: 'from-blue-400 to-indigo-500',
        maxSlotsPerDay: (d) => [0, 13, 13, 13, 13, 10, 0][d] ?? 13,
        baseBookingRatio: (d) => [0, 0.62, 0.55, 0.70, 0.58, 0.50, 0][d] ?? 0.60,
        emergencyBuffer: 2,
    },
    {
        id: 'd3', name: 'Dr. Amira Hassan', initials: 'AH',
        specialty: 'Pediatrician', color: 'from-purple-400 to-pink-500',
        maxSlotsPerDay: (d) => [0, 19, 19, 19, 19, 15, 0][d] ?? 19,
        baseBookingRatio: (d) => [0, 0.84, 0.72, 0.68, 0.78, 0.60, 0][d] ?? 0.72,
        emergencyBuffer: 3,
    },
    {
        id: 'd4', name: 'Dr. Ravi Kumar', initials: 'RK',
        specialty: 'Neurologist', color: 'from-orange-400 to-red-500',
        maxSlotsPerDay: (d) => [0, 10, 10, 10, 10, 8, 0][d] ?? 10,
        baseBookingRatio: (d) => [0, 0.40, 0.30, 0.50, 0.35, 0.25, 0][d] ?? 0.38,
        emergencyBuffer: 2,
    },
    {
        id: 'd5', name: 'Dr. Meera Shah', initials: 'MS',
        specialty: 'Gynecologist', color: 'from-rose-400 to-pink-500',
        maxSlotsPerDay: (d) => [0, 18, 18, 18, 18, 14, 0][d] ?? 18,
        baseBookingRatio: (d) => [0, 0.94, 0.85, 0.78, 0.90, 0.72, 0][d] ?? 0.83,
        emergencyBuffer: 3,
    },
    {
        id: 'd6', name: 'Dr. Aditya Roy', initials: 'AR',
        specialty: 'Dermatologist', color: 'from-cyan-400 to-sky-500',
        maxSlotsPerDay: (d) => [0, 20, 20, 20, 20, 16, 0][d] ?? 20,
        baseBookingRatio: (d) => [0, 0.45, 0.40, 0.55, 0.42, 0.35, 0][d] ?? 0.43,
        emergencyBuffer: 2,
    },
];

const getStorageKey = (doctorId: string, date: string) => `slot_${doctorId}_${date}`;

function loadSlots(doctorId: string, date: string, def: DoctorDef): SlotState[] {
    const key = getStorageKey(doctorId, date);
    const saved = localStorage.getItem(key);
    if (saved) {
        try { return JSON.parse(saved); } catch { }
    }
    const d = new Date(date + 'T00:00:00');
    const dayOfWeek = d.getDay();
    const maxSlots = def.maxSlotsPerDay(dayOfWeek);
    const ratio = def.baseBookingRatio(dayOfWeek);
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return ALL_TIMES.map(t => ({ time: t, booked: true }));
    }
    const seed = parseInt(date.replace(/-/g, '')) + doctorId.charCodeAt(1);
    const slots = ALL_TIMES.slice(0, maxSlots).map((time, i) => {
        const pseudo = Math.abs(Math.sin(seed * (i + 1) * 37)) % 1;
        return { time, booked: pseudo < ratio };
    });
    const extra = ALL_TIMES.slice(maxSlots).map(time => ({ time, booked: true }));
    return [...slots, ...extra];
}

function saveSlots(doctorId: string, date: string, slots: SlotState[]) {
    localStorage.setItem(getStorageKey(doctorId, date), JSON.stringify(slots));
}

interface DoctorAvailabilityProps {
    onSelectSlot?: (doctor: string, specialty: string, time: string, date: string) => void;
    compact?: boolean;
}

const DoctorAvailability: React.FC<DoctorAvailabilityProps> = ({ onSelectSlot, compact }) => {
    const today = new Date().toISOString().split('T')[0];

    const dateStrip = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const iso = d.toISOString().split('T')[0];
        const dow = d.getDay();
        return {
            iso,
            label: i === 0 ? 'TODAY' : i === 1 ? 'TMRW' : d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
            day: d.getDate(),
            isWeekend: dow === 0 || dow === 6,
        };
    });

    const [viewDate, setViewDate] = useState(today);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [allSlots, setAllSlots] = useState<Record<string, SlotState[]>>({});
    const [pendingSlot, setPendingSlot] = useState<{ doctorId: string; time: string } | null>(null);

    useEffect(() => {
        const loaded: Record<string, SlotState[]> = {};
        for (const doc of DOCTORS) {
            loaded[doc.id] = loadSlots(doc.id, viewDate, doc);
        }
        setAllSlots(loaded);
        setPendingSlot(null);
        setExpandedId(null);
    }, [viewDate]);

    const bookSlot = useCallback((doctorId: string, time: string) => {
        setAllSlots(prev => {
            const updated = prev[doctorId].map(s =>
                s.time === time ? { ...s, booked: true } : s
            );
            saveSlots(doctorId, viewDate, updated);
            return { ...prev, [doctorId]: updated };
        });
        const doc = DOCTORS.find(d => d.id === doctorId)!;
        onSelectSlot?.(doc.name, doc.specialty, time, viewDate);
        setPendingSlot(null);
        setExpandedId(null);
    }, [viewDate, onSelectSlot]);

    const getStatus = (doctorId: string, def: DoctorDef) => {
        const slots = allSlots[doctorId] || [];
        const dow = new Date(viewDate + 'T00:00:00').getDay();
        const maxSlots = def.maxSlotsPerDay(dow);
        const bookedCount = slots.slice(0, maxSlots).filter(s => s.booked).length;
        const available = Math.max(0, maxSlots - def.emergencyBuffer - bookedCount);
        const fillPct = maxSlots > def.emergencyBuffer
            ? (bookedCount / (maxSlots - def.emergencyBuffer)) * 100
            : 100;

        if (available <= 0 || fillPct >= 100) return { label: 'FULL', color: 'text-red-500 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20', bar: 'bg-red-400', pct: 100, available: 0, bookedCount };
        if (fillPct >= 70) return { label: 'FILLING', color: 'text-amber-500 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20', bar: 'bg-amber-400', pct: fillPct, available, bookedCount };
        return { label: 'OPEN', color: 'text-emerald-500 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20', bar: 'bg-emerald-400', pct: fillPct, available, bookedCount };
    };

    const dayOfWeek = new Date(viewDate + 'T00:00:00').getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return (
        <div className="glass-panel border-white/20 dark:border-gray-800/30 rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">

            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🏥</span>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Doctor Availability</h3>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg font-medium">
                    {viewDate === today ? 'Today' : new Date(viewDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
            </div>

            <div className="flex gap-1.5 px-4 pb-4 overflow-x-auto">
                {dateStrip.map(d => (
                    <button
                        key={d.iso}
                        onClick={() => setViewDate(d.iso)}
                        className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border text-center transition-all shrink-0 ${viewDate === d.iso
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/50 text-white shadow-md transform scale-105'
                            : d.isWeekend
                                ? 'border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/30'
                                : 'border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        <span className="text-[9px] font-medium tracking-wider leading-none mb-1">{d.label}</span>
                        <span className="text-lg font-semibold leading-none">{d.day}</span>
                    </button>
                ))}
            </div>

            {isWeekend && (
                <div className="mx-4 mb-4 text-center py-8 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="text-3xl mb-2">😴</div>
                    <div className="text-sm font-medium">Clinic closed on weekends</div>
                    <div className="text-xs mt-1">Please select a weekday</div>
                </div>
            )}

            {!isWeekend && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {DOCTORS.map(doc => {
                        const status = getStatus(doc.id, doc);
                        const slots = allSlots[doc.id] || [];
                        const dow = new Date(viewDate + 'T00:00:00').getDay();
                        const maxSlots = doc.maxSlotsPerDay(dow);
                        const offeredSlots = slots.slice(0, maxSlots);
                        const freeSlots = offeredSlots.filter(s => !s.booked);
                        const isExpanded = expandedId === doc.id;

                        return (
                            <div key={doc.id} className="px-5 py-4 space-y-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                <div
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${doc.color} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>
                                            {doc.initials}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">{doc.name}</div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500">{doc.specialty}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${status.color}`}>
                                            {status.label}
                                        </span>
                                        <span className="text-gray-300 dark:text-gray-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className={`h-1.5 rounded-full transition-all duration-700 ${status.bar}`}
                                            style={{ width: `${Math.min(status.pct, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
                                        <span>{status.bookedCount}/{maxSlots - doc.emergencyBuffer} booked</span>
                                        <span className="flex items-center gap-1">
                                            <span className="text-blue-400">🛡</span>
                                            {doc.emergencyBuffer} reserved
                                        </span>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="space-y-3 pt-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                {freeSlots.length > 0
                                                    ? `${freeSlots.length} open slot${freeSlots.length !== 1 ? 's' : ''}`
                                                    : '❌ No open slots'}
                                            </span>
                                            {status.available > 0 && (
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500">Tap to book</span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-4 gap-1.5">
                                            {offeredSlots.map(slot => {
                                                const isPending = pendingSlot?.doctorId === doc.id && pendingSlot?.time === slot.time;
                                                return (
                                                    <button
                                                        key={slot.time}
                                                        disabled={slot.booked}
                                                        onClick={() => {
                                                            if (slot.booked) return;
                                                            setPendingSlot(prev =>
                                                                prev?.doctorId === doc.id && prev?.time === slot.time ? null : { doctorId: doc.id, time: slot.time }
                                                            );
                                                        }}
                                                        className={`px-1 py-1.5 rounded-xl text-[11px] font-medium text-center transition-all duration-150 border ${slot.booked
                                                            ? 'bg-gray-50 dark:bg-gray-800/30 text-gray-300 dark:text-gray-600 border-transparent cursor-not-allowed line-through'
                                                            : isPending
                                                                ? 'bg-blue-500 text-white border-blue-400 shadow-sm scale-105'
                                                                : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-600 dark:text-gray-300 cursor-pointer'
                                                            }`}
                                                    >
                                                        {slot.time.replace(' AM', 'a').replace(' PM', 'p')}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {pendingSlot?.doctorId === doc.id && (
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={() => bookSlot(doc.id, pendingSlot.time)}
                                                    className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md active:scale-95"
                                                >
                                                    ✓ Confirm {pendingSlot.time} with {doc.name.split(' ').slice(-1)[0]}
                                                </button>
                                                <button
                                                    onClick={() => setPendingSlot(null)}
                                                    className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-500 text-xs rounded-xl transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                {[
                    { color: 'bg-emerald-400', label: 'Open' },
                    { color: 'bg-amber-400', label: 'Filling' },
                    { color: 'bg-red-400', label: 'Full' },
                ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                        <span className={`w-1.5 h-1.5 rounded-full ${color} inline-block`} />
                        {label}
                    </div>
                ))}
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 ml-auto">
                    <span>🛡</span> Reserved
                </div>
            </div>
        </div>
    );
};

export default DoctorAvailability;
