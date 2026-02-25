import React, { useState, useEffect } from 'react';

interface DoctorSlot {
    time: string;
    available: boolean;
}

interface Doctor {
    id: string;
    name: string;
    specialty: string;
    maxSlots: number;
    emergencyBuffer: number;
    bookedSlots: number;
    timeSlots: DoctorSlot[];
}

const TIME_SLOTS = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM',
    '04:30 PM', '05:00 PM',
];

// Simulate doctor data — in production this would come from an API
function generateDoctors(selectedDate: string): Doctor[] {
    const seed = selectedDate ? selectedDate.split('-').join('') : '20260226';
    const hash = (n: number) => (parseInt(seed) * (n + 7) * 31) % 14;

    return [
        {
            id: 'd1', name: 'Dr. Sarah Patel', specialty: 'General Physician',
            maxSlots: 17, emergencyBuffer: 3, bookedSlots: 15,
            timeSlots: TIME_SLOTS.map((t, i) => ({ time: t, available: hash(i) > 11 })),
        },
        {
            id: 'd2', name: 'Dr. James Chen', specialty: 'Cardiologist',
            maxSlots: 13, emergencyBuffer: 2, bookedSlots: 8,
            timeSlots: TIME_SLOTS.map((t, i) => ({ time: t, available: hash(i + 3) > 8 })),
        },
        {
            id: 'd3', name: 'Dr. Amira Hassan', specialty: 'Pediatrician',
            maxSlots: 22, emergencyBuffer: 3, bookedSlots: 16,
            timeSlots: TIME_SLOTS.map((t, i) => ({ time: t, available: hash(i + 1) > 10 })),
        },
        {
            id: 'd4', name: 'Dr. Ravi Kumar', specialty: 'Neurologist',
            maxSlots: 12, emergencyBuffer: 2, bookedSlots: 4,
            timeSlots: TIME_SLOTS.map((t, i) => ({ time: t, available: hash(i + 5) > 6 })),
        },
        {
            id: 'd5', name: 'Dr. Meera Shah', specialty: 'Gynecologist',
            maxSlots: 18, emergencyBuffer: 3, bookedSlots: 17,
            timeSlots: TIME_SLOTS.map((t, i) => ({ time: t, available: hash(i + 2) > 12 })),
        },
        {
            id: 'd6', name: 'Dr. Aditya Roy', specialty: 'Dermatologist',
            maxSlots: 20, emergencyBuffer: 2, bookedSlots: 9,
            timeSlots: TIME_SLOTS.map((t, i) => ({ time: t, available: hash(i + 6) > 7 })),
        },
    ];
}

function getAvailabilityStatus(booked: number, max: number, buffer: number) {
    const available = max - buffer - booked;
    const fillPct = (booked / (max - buffer)) * 100;
    if (available <= 0) return { label: 'FULL', color: 'text-red-400 bg-red-400/10 border-red-400/30', bar: 'bg-red-500', pct: 100 };
    if (fillPct >= 75) return { label: 'FILLING UP', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', bar: 'bg-yellow-500', pct: fillPct };
    return { label: 'AVAILABLE', color: 'text-green-400 bg-green-400/10 border-green-400/30', bar: 'bg-green-500', pct: fillPct };
}

interface DoctorAvailabilityProps {
    selectedSpecialty?: string;
    selectedDate?: string;
    onSelectSlot?: (doctor: string, specialty: string, time: string) => void;
}

const DoctorAvailability: React.FC<DoctorAvailabilityProps> = ({
    selectedSpecialty, selectedDate, onSelectSlot,
}) => {
    const today = new Date().toISOString().split('T')[0];
    const [viewDate, setViewDate] = useState(selectedDate || today);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<{ doctorId: string; time: string } | null>(null);

    const doctors = generateDoctors(viewDate).filter(d =>
        !selectedSpecialty || d.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase())
    );

    // Generate 7 days for the date strip
    const dateStrip = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
            iso: d.toISOString().split('T')[0],
            label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
            day: d.getDate(),
        };
    });

    return (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🏥</span>
                    <h3 className="font-bold text-slate-100 tracking-wide text-sm uppercase">Doctor Availability</h3>
                </div>
                <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                    {viewDate === today ? 'Today' : new Date(viewDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
            </div>

            {/* Date Strip */}
            <div className="flex gap-2 px-5 pb-4 overflow-x-auto scrollbar-none">
                {dateStrip.map(d => (
                    <button
                        key={d.iso}
                        onClick={() => { setViewDate(d.iso); setExpandedId(null); setSelectedSlot(null); }}
                        className={`flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-medium transition-all shrink-0 ${viewDate === d.iso
                                ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/20'
                                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                            }`}
                    >
                        <span className="text-[10px] uppercase tracking-wider">{d.label}</span>
                        <span className="text-base font-bold">{d.day}</span>
                    </button>
                ))}
            </div>

            {/* Doctor List */}
            <div className="divide-y divide-slate-800">
                {doctors.map(doc => {
                    const status = getAvailabilityStatus(doc.bookedSlots, doc.maxSlots, doc.emergencyBuffer);
                    const available = Math.max(0, doc.maxSlots - doc.emergencyBuffer - doc.bookedSlots);
                    const isExpanded = expandedId === doc.id;
                    const freeSlots = doc.timeSlots.filter(s => s.available);

                    return (
                        <div key={doc.id} className="px-5 py-4 space-y-3">
                            {/* Doctor row */}
                            <div
                                className="flex items-start justify-between cursor-pointer"
                                onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {doc.name.split(' ').map(w => w[0]).slice(1, 3).join('')}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-100 text-sm">{doc.name}</div>
                                        <div className="text-xs text-slate-400">{doc.specialty}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                                        {status.label}
                                    </span>
                                    <span className="text-slate-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1">
                                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-2.5 rounded-full transition-all duration-700 ${status.bar}`}
                                        style={{ width: `${Math.min(status.pct, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>{doc.bookedSlots}/{doc.maxSlots - doc.emergencyBuffer} slots booked</span>
                                    <span className="flex items-center gap-1">
                                        <span className="text-blue-400">🛡</span>
                                        {doc.emergencyBuffer} emergency reserved
                                    </span>
                                </div>
                            </div>

                            {/* Expanded: Time Slots */}
                            {isExpanded && (
                                <div className="pt-1 space-y-2">
                                    <div className="text-xs text-slate-400 font-medium">
                                        {available > 0 ? `${available} open slot${available !== 1 ? 's' : ''}` : 'No open slots'}
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {doc.timeSlots.map(slot => (
                                            <button
                                                key={slot.time}
                                                disabled={!slot.available}
                                                onClick={() => {
                                                    if (!slot.available) return;
                                                    const key = { doctorId: doc.id, time: slot.time };
                                                    setSelectedSlot(prev =>
                                                        prev?.doctorId === doc.id && prev?.time === slot.time ? null : key
                                                    );
                                                    onSelectSlot?.(doc.name, doc.specialty, slot.time);
                                                }}
                                                className={`px-1 py-1.5 rounded-lg text-[11px] font-medium text-center transition-all ${!slot.available
                                                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed line-through'
                                                        : selectedSlot?.doctorId === doc.id && selectedSlot?.time === slot.time
                                                            ? 'bg-cyan-500 text-white ring-2 ring-cyan-400/50 shadow-md'
                                                            : 'bg-slate-800 hover:bg-cyan-500/20 hover:border-cyan-500 border border-slate-700 text-slate-300 hover:text-cyan-400'
                                                    }`}
                                            >
                                                {slot.time.replace(' AM', 'a').replace(' PM', 'p')}
                                            </button>
                                        ))}
                                    </div>
                                    {selectedSlot?.doctorId === doc.id && (
                                        <button
                                            onClick={() => onSelectSlot?.(doc.name, doc.specialty, selectedSlot.time)}
                                            className="w-full py-2 mt-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-lg"
                                        >
                                            Book {selectedSlot.time} with {doc.name}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer legend */}
            <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Available</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span> Filling Up</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Full</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto"><span>🛡</span> Emergency reserved</div>
            </div>
        </div>
    );
};

export default DoctorAvailability;
