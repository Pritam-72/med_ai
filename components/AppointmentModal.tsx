import React, { useState, useEffect } from 'react';
import { Appointment, ConsultType, WaitlistEntry } from '../types';
import ConsultTypeSelector from './ConsultTypeSelector';
import DoctorAvailability from './DoctorAvailability';
import { canBook, incrementBooking, decrementBooking, getCapacityInfo, getNextAvailableDate, addToWaitlist, getWaitlist, removeFromWaitlist } from '../services/capacity';
import { classifySeverity } from '../services/severity';

interface AppointmentModalProps {
    isOpen: boolean;
    appointments: Appointment[];
    onBook: (appt: Omit<Appointment, 'id' | 'bookedAt' | 'status' | 'bookedVia'>) => void;
    onCancel: (id: string) => void;
    onClose: () => void;
    patientName: string;
}

const SPECIALTIES = [
    'General Physician', 'Cardiologist', 'Dermatologist', 'Neurologist',
    'Orthopedic', 'Pediatrician', 'Psychiatrist', 'Gynecologist',
    'Ophthalmologist', 'ENT Specialist', 'Endocrinologist', 'Urologist',
];

const TIME_SLOTS = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM',
    '04:30 PM', '05:00 PM',
];

const AppointmentModal: React.FC<AppointmentModalProps> = ({
    isOpen, appointments, onBook, onCancel, onClose, patientName,
}) => {
    const [tab, setTab] = useState<'availability' | 'upcoming' | 'book' | 'waitlist'>('availability');
    const [form, setForm] = useState({
        patientName: patientName || '',
        doctorSpecialty: SPECIALTIES[0],
        preferredDate: '',
        preferredTime: TIME_SLOTS[0],
        notes: '',
        consultType: 'voice' as ConsultType,
        symptoms: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
    const [capacityInfo, setCapacityInfo] = useState<{ booked: number; available: number; isFull: boolean } | null>(null);
    const [nextAvailable, setNextAvailable] = useState<string | null>(null);
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [joinedWaitlistId, setJoinedWaitlistId] = useState<string | null>(null);

    const upcoming = appointments.filter(a => a.status === 'upcoming');
    const past = appointments.filter(a => a.status !== 'upcoming');
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (form.doctorSpecialty && form.preferredDate) {
            const info = getCapacityInfo(form.doctorSpecialty, form.preferredDate);
            setCapacityInfo(info);
            if (info.isFull) {
                setNextAvailable(getNextAvailableDate(form.doctorSpecialty, form.preferredDate));
            } else {
                setNextAvailable(null);
            }
        }
    }, [form.doctorSpecialty, form.preferredDate]);

    useEffect(() => {
        setWaitlist(getWaitlist());
    }, [tab]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.preferredDate) return;
        if (capacityInfo?.isFull) return;

        const severityResult = form.symptoms
            ? classifySeverity([form.symptoms])
            : null;

        onBook({
            patientName: form.patientName,
            doctorSpecialty: form.doctorSpecialty,
            preferredDate: form.preferredDate,
            preferredTime: form.preferredTime,
            notes: form.notes,
            consultType: form.consultType,
            severity: severityResult?.level,
        });
        incrementBooking(form.doctorSpecialty, form.preferredDate);
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setTab('upcoming');
        }, 2500);
    };

    const handleJoinWaitlist = () => {
        if (!form.preferredDate) return;
        const severityResult = form.symptoms ? classifySeverity([form.symptoms]) : null;
        const entry = addToWaitlist({
            patientName: form.patientName || patientName,
            doctorSpecialty: form.doctorSpecialty,
            preferredDate: form.preferredDate,
            severityScore: severityResult?.score || 3,
        });
        setJoinedWaitlistId(entry.id);
        setWaitlist(getWaitlist());
    };

    const handleRemoveFromWaitlist = (id: string) => {
        removeFromWaitlist(id);
        setWaitlist(getWaitlist());
        if (joinedWaitlistId === id) setJoinedWaitlistId(null);
    };

    const handleCancel = (id: string, specialty: string, date: string) => {
        onCancel(id);
        decrementBooking(specialty, date);
        setCancelConfirm(null);
    };

    const inputClasses = "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-400 transition-colors";

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">📅 Appointments</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">×</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-800 shrink-0 overflow-x-auto">
                    {([
                        { key: 'availability', label: '🏥 Availability' },
                        { key: 'upcoming', label: `📅 Upcoming (${upcoming.length})` },
                        { key: 'book', label: '➕ Book' },
                        { key: 'waitlist', label: `📋 Waitlist (${waitlist.length})` },
                    ] as const).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`shrink-0 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${tab === key ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="overflow-y-auto flex-1 p-4">
                    {tab === 'availability' && (
                        <DoctorAvailability
                            selectedSpecialty={form.doctorSpecialty}
                            selectedDate={form.preferredDate}
                            onSelectSlot={(doctor, specialty, time) => {
                                setForm(f => ({
                                    ...f,
                                    doctorSpecialty: specialty,
                                    preferredTime: time,
                                }));
                                setTab('book');
                            }}
                        />
                    )}
                    {tab === 'upcoming' && (
                        <div className="space-y-2">
                            {upcoming.length === 0 && past.length === 0 && (
                                <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                                    <div className="text-4xl mb-3">📅</div>
                                    <div className="font-medium text-sm">No appointments yet</div>
                                    <button onClick={() => setTab('book')} className="mt-3 text-blue-500 underline text-xs">Book your first</button>
                                </div>
                            )}
                            {upcoming.map(appt => {
                                const consultIcon = appt.consultType === 'voice' ? '📞' : appt.consultType === 'video' ? '📹' : '🏥';
                                const severityBadge = appt.severity === 'severe' ? '🚨' : appt.severity === 'moderate' ? '⚠️' : appt.severity === 'mild' ? '✅' : '';
                                return (
                                    <div key={appt.id} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{appt.doctorSpecialty}</span>
                                                    <span className="text-xs">{consultIcon}</span>
                                                    {severityBadge && <span className="text-xs">{severityBadge}</span>}
                                                </div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{appt.preferredDate} at {appt.preferredTime}</div>
                                                {appt.consultType && (
                                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">{appt.consultType} consultation</div>
                                                )}
                                            </div>
                                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-500">Upcoming</span>
                                        </div>
                                        {appt.notes && <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg p-2">{appt.notes}</div>}
                                        {cancelConfirm === appt.id ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCancel(appt.id, appt.doctorSpecialty, appt.preferredDate)} className="flex-1 py-1.5 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 text-red-500 text-xs rounded-lg transition-colors">Confirm Cancel</button>
                                                <button onClick={() => setCancelConfirm(null)} className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs rounded-lg transition-colors">Keep</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setCancelConfirm(appt.id)} className="text-xs text-red-400 hover:text-red-500 transition-colors">Cancel appointment</button>
                                        )}
                                    </div>
                                );
                            })}
                            {past.length > 0 && (
                                <>
                                    <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 uppercase tracking-wider">Past</div>
                                    {past.map(appt => (
                                        <div key={appt.id} className="bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-xl p-4 opacity-60">
                                            <div className="font-medium text-gray-600 dark:text-gray-400 text-sm">{appt.doctorSpecialty}</div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500">{appt.preferredDate} · {appt.status}</div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    {tab === 'book' && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {submitted ? (
                                <div className="text-center py-10 space-y-2">
                                    <div className="text-4xl">✅</div>
                                    <div className="text-gray-700 dark:text-gray-200 font-medium">Booked!</div>
                                    <div className="text-gray-400 text-sm">Your appointment is confirmed.</div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide block mb-1.5">Patient Name</label>
                                        <input value={form.patientName} onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))}
                                            className={inputClasses} placeholder="Your full name" required />
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide block mb-1.5">Specialty</label>
                                        <select value={form.doctorSpecialty} onChange={e => setForm(f => ({ ...f, doctorSpecialty: e.target.value }))}
                                            className={inputClasses}>
                                            {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide block mb-1.5">Date</label>
                                            <input type="date" value={form.preferredDate} min={today}
                                                onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))}
                                                className={inputClasses} required />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide block mb-1.5">Time</label>
                                            <select value={form.preferredTime} onChange={e => setForm(f => ({ ...f, preferredTime: e.target.value }))}
                                                className={inputClasses}>
                                                {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {capacityInfo && form.preferredDate && (
                                        <div className={`text-xs rounded-xl px-3 py-2 ${capacityInfo.isFull ? 'bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-200 dark:border-red-900/30' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 border border-emerald-200 dark:border-emerald-900/30'}`}>
                                            {capacityInfo.isFull
                                                ? `⚠️ Full. Next available: ${nextAvailable}. Join waitlist.`
                                                : `✅ ${capacityInfo.available} slot${capacityInfo.available !== 1 ? 's' : ''} available`}
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide block mb-1.5">Symptoms (optional)</label>
                                        <input value={form.symptoms} onChange={e => setForm(f => ({ ...f, symptoms: e.target.value }))}
                                            className={inputClasses} placeholder="e.g. fever, chest pain..." />
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide block mb-1.5">Notes</label>
                                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                            className={`${inputClasses} resize-none h-16`}
                                            placeholder="Additional information..." />
                                    </div>

                                    <ConsultTypeSelector
                                        selected={form.consultType}
                                        onChange={ct => setForm(f => ({ ...f, consultType: ct }))}
                                    />

                                    {capacityInfo?.isFull ? (
                                        <button type="button" onClick={handleJoinWaitlist}
                                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors">
                                            📋 Join Waitlist
                                        </button>
                                    ) : (
                                        <button type="submit"
                                            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-all shadow-sm">
                                            Confirm Appointment
                                        </button>
                                    )}
                                </>
                            )}
                        </form>
                    )}

                    {tab === 'waitlist' && (
                        <div className="space-y-2">
                            {waitlist.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                                    <div className="text-4xl mb-3">📋</div>
                                    <div className="font-medium text-sm">No entries</div>
                                    <p className="text-xs mt-1">Join the waitlist when a slot is full.</p>
                                </div>
                            ) : (
                                waitlist.map((entry, idx) => (
                                    <div key={entry.id} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">{entry.doctorSpecialty}</div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500">{entry.preferredDate} · Priority #{idx + 1}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${entry.severityScore >= 8 ? 'bg-red-50 dark:bg-red-950/20 text-red-500' : entry.severityScore >= 4 ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-500' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500'}`}>
                                                    Score: {entry.severityScore}
                                                </span>
                                                <button onClick={() => handleRemoveFromWaitlist(entry.id)} className="text-red-400 hover:text-red-500 text-xs transition-colors">Remove</button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppointmentModal;
