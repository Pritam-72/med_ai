
import React, { useState } from 'react';
import { UserProfile as UserProfileType } from '../types';

interface UserProfileProps {
    profile: UserProfileType;
    onSave: (profile: UserProfileType) => void;
    isOpen: boolean;
    onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ profile, onSave, isOpen, onClose }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<UserProfileType>(profile);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(form);
        setEditing(false);
    };

    const handleChange = (field: keyof UserProfileType, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 no-print" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Patient Profile</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {(['name', 'age', 'allergies', 'conditions', 'medications'] as const).map((field) => (
                        <div key={field}>
                            <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                                {field === 'conditions' ? 'Existing Conditions' : field.charAt(0).toUpperCase() + field.slice(1)}
                            </label>
                            {editing ? (
                                field === 'allergies' || field === 'conditions' || field === 'medications' ? (
                                    <textarea
                                        value={form[field]}
                                        onChange={(e) => handleChange(field, e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-400 outline-none resize-none transition-colors"
                                        rows={2}
                                        placeholder={`Enter your ${field}...`}
                                    />
                                ) : (
                                    <input
                                        type={field === 'age' ? 'number' : 'text'}
                                        value={form[field]}
                                        onChange={(e) => handleChange(field, e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-400 outline-none transition-colors"
                                        placeholder={`Enter your ${field}...`}
                                    />
                                )
                            ) : (
                                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-xl">
                                    {form[field] || <span className="text-gray-300 dark:text-gray-600 italic">Not provided</span>}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-3">
                    {editing ? (
                        <>
                            <button onClick={() => { setForm(profile); setEditing(false); }} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors">
                                Save
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setEditing(true)} className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors">
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
