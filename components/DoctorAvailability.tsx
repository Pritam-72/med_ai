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
    // base slots per weekday (0=Sun..6=Sat) — fewer on weekends
    maxSlotsPerDay: (day: number) => number;
    emergencyBuffer: number;
    // base "pre-filled" ratio per weekday (realistic pattern)
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
        specialty: 'General Physician', color: 'from-emerald-500 to-teal-600',
        maxSlotsPerDay: (d) => [0, 17, 17, 17, 17, 17, 0][d] ?? 17,
        baseBookingRatio: (d) => [0, 0.88, 0.75, 0.65, 0.80, 0.70, 0][d] ?? 0.75,
        emergencyBuffer: 3,
    },
    {
        id: 'd2', name: 'Dr. James Chen', initials: 'JC',
        specialty: 'Cardiologist', color: 'from-blue-500 to-indigo-600',
        maxSlotsPerDay: (d) => [0, 13, 13, 13, 13, 10, 0][d] ?? 13,
        baseBookingRatio: (d) => [0, 0.62, 0.55, 0.70, 0.58, 0.50, 0][d] ?? 0.60,
        emergencyBuffer: 2,
    },
    {
        id: 'd3', name: 'Dr. Amira Hassan', initials: 'AH',
        specialty: 'Pediatrician', color: 'from-purple-500 to-pink-600',
        maxSlotsPerDay: (d) => [0, 19, 19, 19, 19, 15, 0][d] ?? 19,
        baseBookingRatio: (d) => [0, 0.84, 0.72, 0.68, 0.78, 0.60, 0][d] ?? 0.72,
        emergencyBuffer: 3,
    },
    {
        id: 'd4', name: 'Dr. Ravi Kumar', initials: 'RK',
        specialty: 'Neurologist', color: 'from-orange-500 to-red-600',
        maxSlotsPerDay: (d) => [0, 10, 10, 10, 10, 8, 0][d] ?? 10,
        baseBookingRatio: (d) => [0, 0.40, 0.30, 0.50, 0.35, 0.25, 0][d] ?? 0.38,
        emergencyBuffer: 2,
    },
    {
        id: 'd5', name: 'Dr. Meera Shah', initials: 'MS',
        specialty: 'Gynecologist', color: 'from-rose-500 to-pink-600',
        maxSlotsPerDay: (d) => [0, 18, 18, 18, 18, 14, 0][d] ?? 18,
        baseBookingRatio: (d) => [0, 0.94, 0.85, 0.78, 0.90, 0.72, 0][d] ?? 0.83,
        emergencyBuffer: 3,
    },
    {
        id: 'd6', name: 'Dr. Aditya Roy', initials: 'AR',
        specialty: 'Dermatologist', color: 'from-cyan-500 to-sky-600',
        maxSlotsPerDay: (d) => [0, 20, 20, 20, 20, 16, 0][d] ?? 20,
        baseBookingRatio: (d) => [0, 0.45, 0.40, 0.55, 0.42, 0.35, 0][d] ?? 0.43,
        emergencyBuffer: 2,
    },
];

// ─── Persistence helpers ──────────────────────────────────────────────────────
const getStorageKey = (doctorId: string, date: string) => `slot_${doctorId}_${date}`;

function loadSlots(doctorId: string, date: string, def: DoctorDef): SlotState[] {
    const key = getStorageKey(doctorId, date);
    const saved = localStorage.getItem(key);
    if (saved) {
        try { return JSON.parse(saved); } catch { }
    }
    // Generate deterministic base availability for this date
    const d = new Date(date + 'T00:00:00');
    const dayOfWeek = d.getDay();
    const maxSlots = def.maxSlotsPerDay(dayOfWeek);
    const ratio = def.baseBookingRatio(dayOfWeek);
    // Weekend = no availability
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return ALL_TIMES.map(t => ({ time: t, booked: true }));
    }
    // Use a deterministic seed per doctor+date for which slots are pre-booked
    const seed = parseInt(date.replace(/-/g, '')) + doctorId.charCodeAt(1);
    const slots = ALL_TIMES.slice(0, maxSlots).map((time, i) => {
        const pseudo = Math.abs(Math.sin(seed * (i + 1) * 37)) % 1;
        return { time, booked: pseudo < ratio };
    });
    // Times beyond maxSlots are always booked (not offered)
    const extra = ALL_TIMES.slice(maxSlots).map(time => ({ time, booked: true }));
    return [...slots, ...extra];
}

function saveSlots(doctorId: string, date: string, slots: SlotState[]) {
    localStorage.setItem(getStorageKey(doctorId, date), JSON.stringify(slots));
}

// ─── Component ────────────────────────────────────────────────────────────────
interface DoctorAvailabilityProps {
    onSelectSlot?: (doctor: string, specialty: string, time: string, date: string) => void;
    compact?: boolean;
}

const DoctorAvailability: React.FC<DoctorAvailabilityProps> = ({ onSelectSlot, compact }) => {
    const today = new Date().toISOString().split('T')[0];

    // Date strip — 7 days starting from today
    const dateStrip = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const iso = d.toISOString().split('T')[0];
        const dow = d.getDay();
        return {
            iso,
            label: i === 0 ? 'TODAY' : i === 1 ? 'TOMORROW' : d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
            day: d.getDate(),
            isWeekend: dow === 0 || dow === 6,
        };
    });

    const [viewDate, setViewDate] = useState(today);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Per-doctor slot state — keyed by doctorId
    const [allSlots, setAllSlots] = useState<Record<string, SlotState[]>>({});
    const [pendingSlot, setPendingSlot] = useState<{ doctorId: string; time: string } | null>(null);

    // Load slots whenever date changes
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

        if (available <= 0 || fillPct >= 100) return { label: 'FULL', color: 'text-red-400 border-red-500/40 bg-red-500/10', bar: 'bg-red-500', pct: 100, available: 0, bookedCount };
        if (fillPct >= 70) return { label: 'FILLING UP', color: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10', bar: 'bg-yellow-500', pct: fillPct, available, bookedCount };
        return { label: 'AVAILABLE', color: 'text-green-400 border-green-500/40 bg-green-500/10', bar: 'bg-green-500', pct: fillPct, available, bookedCount };
    };

    const dayOfWeek = new Date(viewDate + 'T00:00:00').getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🏥</span>
                    <h3 className="font-black text-slate-100 tracking-widest text-xs uppercase">Doctor Availability</h3>
                </div>
                <span className="text-xs text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full font-medium">
                    {viewDate === today ? 'Today' : new Date(viewDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
            </div>

            {/* ── Date Strip ── */}
            <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
                {dateStrip.map(d => (
                    <button
                        key={d.iso}
                        onClick={() => setViewDate(d.iso)}
                        className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-2xl border text-center transition-all shrink-0 min-w-[56px] ${viewDate === d.iso
                                ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/30'
                                : d.isWeekend
                                    ? 'border-slate-800 text-slate-600 bg-slate-800/30'
                                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 bg-slate-800/20'
                            }`}
                    >
                        <span className="text-[9px] font-bold tracking-wider">{d.label}</span>
                        <span className="text-xl font-black leading-none">{d.day}</span>
                    </button>
                ))}
            </div>

            {/* ── Weekend message ── */}
            {isWeekend && (
                <div className="mx-4 mb-4 text-center py-8 text-slate-500 bg-slate-800/40 rounded-xl border border-slate-700/30">
                    <div className="text-3xl mb-2">😴</div>
                    <div className="text-sm font-medium text-slate-400">Clinic closed on weekends</div>
                    <div className="text-xs text-slate-500 mt-1">Please select a weekday</div>
                </div>
            )}

            {/* ── Doctor Cards ── */}
            {!isWeekend && (
                <div className="divide-y divide-slate-800">
                    {DOCTORS.map(doc => {
                        const status = getStatus(doc.id, doc);
                        const slots = allSlots[doc.id] || [];
                        const dow = new Date(viewDate + 'T00:00:00').getDay();
                        const maxSlots = doc.maxSlotsPerDay(dow);
                        const offeredSlots = slots.slice(0, maxSlots);
                        const freeSlots = offeredSlots.filter(s => !s.booked);
                        const isExpanded = expandedId === doc.id;

                        return (
                            <div key={doc.id} className="px-5 py-4 space-y-3 hover:bg-slate-800/20 transition-colors">
                                {/* ── Row ── */}
                                <div
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${doc.color} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md`}>
                                            {doc.initials}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-100 text-sm">{doc.name}</div>
                                            <div className="text-xs text-slate-400">{doc.specialty}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${status.color}`}>
                                            {status.label}
                                        </span>
                                        <span className="text-slate-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                                    </div>
                                </div>

                                {/* ── Progress bar ── */}
                                <div className="space-y-1.5">
                                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-700 ${status.bar}`}
                                            style={{ width: `${Math.min(status.pct, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-400">
                                        <span>{status.bookedCount}/{maxSlots - doc.emergencyBuffer} slots booked</span>
                                        <span className="flex items-center gap-1">
                                            <span className="text-blue-400">🛡</span>
                                            {doc.emergencyBuffer} emergency reserved
                                        </span>
                                    </div>
                                </div>

                                {/* ── Expanded: Time Slots ── */}
                                {isExpanded && (
                                    <div className="space-y-3 pt-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400 font-semibold">
                                                {freeSlots.length > 0
                                                    ? `${freeSlots.length} open slot${freeSlots.length !== 1 ? 's' : ''}`
                                                    : '❌ No open slots for this day'}
                                            </span>
                                            {status.available > 0 && (
                                                <span className="text-[10px] text-slate-500">Tap a slot to book</span>
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
                                                        className={`px-1 py-1.5 rounded-xl text-[11px] font-semibold text-center transition-all duration-150 border ${slot.booked
                                                                ? 'bg-slate-800/60 text-slate-600 border-transparent cursor-not-allowed line-through'
                                                                : isPending
                                                                    ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/30 scale-105'
                                                                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 cursor-pointer'
                                                            }`}
                                                    >
                                                        {slot.time.replace(' AM', 'a').replace(' PM', 'p')}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Confirm booking button */}
                                        {pendingSlot?.doctorId === doc.id && (
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={() => bookSlot(doc.id, pendingSlot.time)}
                                                    className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                                                >
                                                    ✓ Confirm {pendingSlot.time} with {doc.name.split(' ').slice(-1)[0]}
                                                </button>
                                                <button
                                                    onClick={() => setPendingSlot(null)}
                                                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400 text-xs rounded-xl transition-colors"
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

            {/* ── Legend ── */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-t border-slate-800 bg-slate-900/70">
                {[
                    { color: 'bg-green-500', label: 'Available' },
                    { color: 'bg-yellow-500', label: 'Filling Up' },
                    { color: 'bg-red-500', label: 'Full' },
                ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${color} inline-block`} />
                        {label}
                    </div>
                ))}
                <div className="flex items-center gap-1 text-xs text-slate-500 ml-auto">
                    <span>🛡</span> Emergency reserved
                </div>
            </div>
        </div>
    );
};

export default DoctorAvailability;
