
import React, { useState, useEffect, useCallback } from 'react';
import { SessionStatus, TranscriptionEntry, ToolCallEntry, UserProfile as UserProfileType, SessionRecord, SeverityResult } from './types';
import Header from './components/Header';
import VoiceAgent from './components/VoiceAgent';
import TranscriptionView from './components/TranscriptionView';
import ToolActivity from './components/ToolActivity';
import EmergencySOS from './components/EmergencySOS';
import UserProfileModal from './components/UserProfile';
import CallHistory from './components/CallHistory';
import SessionSummary from './components/SessionSummary';
import VoiceSelector from './components/VoiceSelector';
import AppointmentModal from './components/AppointmentModal';
import SeverityBanner from './components/SeverityBanner';
import FollowUpMonitor from './components/FollowUpMonitor';
import LoadDashboard from './components/LoadDashboard';
import DoctorAvailability from './components/DoctorAvailability';
import { DEFAULT_VOICE_ID } from './services/elevenlabs';
import { Appointment } from './types';
import { classifySeverityFromText } from './services/severity';
import { checkRedFlags } from './services/redFlags';

const STORAGE_KEYS = {
  DARK_MODE: 'medai_darkMode',
  LANGUAGE: 'medai_language',
  PROFILE: 'medai_userProfile',
  SESSIONS: 'medai_sessions',
  VOICE_ID: 'medai_voiceId',
  APPOINTMENTS: 'medai_appointments',
};

const defaultProfile: UserProfileType = {
  name: '',
  age: '',
  allergies: '',
  conditions: '',
  medications: '',
};

const App: React.FC = () => {
  // Core state
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [toolActivities, setToolActivities] = useState<ToolCallEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Feature state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true'; } catch { return false; }
  });
  const [language, setLanguage] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'English'; } catch { return 'English'; }
  });
  const [userProfile, setUserProfile] = useState<UserProfileType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : defaultProfile;
    } catch { return defaultProfile; }
  });
  const [sessions, setSessions] = useState<SessionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEYS.VOICE_ID) || DEFAULT_VOICE_ID; } catch { return DEFAULT_VOICE_ID; }
  });
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // UI modals
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [showLoadDashboard, setShowLoadDashboard] = useState(false);
  const [lastSessionDuration, setLastSessionDuration] = useState(0);

  // Severity & Red Flags
  const [severityResult, setSeverityResult] = useState<SeverityResult | null>(null);
  const [symptomInput, setSymptomInput] = useState('');
  const [redFlagAlert, setRedFlagAlert] = useState<string | null>(null);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.classList.toggle('light', !darkMode);
    try { localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(darkMode)); } catch { }
  }, [darkMode]);

  // Persist language
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.LANGUAGE, language); } catch { }
  }, [language]);

  // Persist profile
  const handleSaveProfile = (profile: UserProfileType) => {
    setUserProfile(profile);
    try { localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile)); } catch { }
  };

  // Persist sessions
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions)); } catch { }
  }, [sessions]);

  // Persist voice selection
  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    try { localStorage.setItem(STORAGE_KEYS.VOICE_ID, voiceId); } catch { }
  };

  // Persist appointments
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments)); } catch { }
  }, [appointments]);

  const handleBookAppointment = (appt: Omit<Appointment, 'id' | 'bookedAt' | 'status' | 'bookedVia'>, via: 'manual' | 'voice' = 'manual') => {
    const newAppt: Appointment = {
      ...appt,
      id: crypto.randomUUID(),
      bookedAt: Date.now(),
      status: 'upcoming',
      bookedVia: via
    };
    setAppointments(prev => [...prev, newAppt]);
  };

  const handleCancelAppointment = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
  };

  // Handlers
  const handleStart = () => setStatus(SessionStatus.CONNECTING);

  const handleEnd = () => setStatus(SessionStatus.IDLE);

  const handleTranscription = useCallback((role: 'user' | 'assistant', text: string) => {
    setTranscriptions(prev => [...prev, { role, text, timestamp: Date.now() }]);
  }, []);

  const handleToolCall = useCallback((call: Omit<ToolCallEntry, 'timestamp'>) => {
    setToolActivities(prev => [...prev, { ...call, timestamp: Date.now() }]);
  }, []);

  const handleToolResult = useCallback((id: string, result: any) => {
    setToolActivities(prev =>
      prev.map(t => t.id === id ? { ...t, result } : t)
    );
  }, []);

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setTimeout(() => setError(null), 8000);
  };

  const handleSessionEnd = (startTime: number) => {
    const duration = Date.now() - startTime;
    setLastSessionDuration(duration);
    if (transcriptions.length > 0) {
      setShowSummary(true);
    }
  };

  const handleSaveSession = () => {
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      date: Date.now(),
      duration: lastSessionDuration,
      transcriptions: [...transcriptions],
      toolCalls: [...toolActivities],
      language,
    };
    setSessions(prev => [...prev, session]);
    setShowSummary(false);

    // Reset for next session
    setTranscriptions([]);
    setToolActivities([]);
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const handleCloseSummary = () => {
    setShowSummary(false);
    setTranscriptions([]);
    setToolActivities([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-mesh-light dark:bg-mesh-dark selection:bg-blue-500/30">
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(d => !d)}
        language={language}
        onLanguageChange={setLanguage}
        onOpenProfile={() => setShowProfile(true)}
        onOpenHistory={() => setShowHistory(true)}
        onOpenAppointments={() => setShowAppointments(true)}
      />

      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <VoiceAgent
              status={status}
              setStatus={setStatus}
              onStart={handleStart}
              onEnd={handleEnd}
              onTranscription={handleTranscription}
              onToolCall={handleToolCall}
              onToolResult={handleToolResult}
              onError={handleError}
              language={language}
              userProfile={userProfile}
              onSessionEnd={handleSessionEnd}
              selectedVoiceId={selectedVoiceId}
              onVoiceBookAppointment={(dept, time, res) => handleBookAppointment({
                patientName: userProfile.name || 'Patient',
                doctorSpecialty: dept,
                preferredDate: time.split('T')[0] || new Date().toISOString().split('T')[0],
                preferredTime: '10:00 AM',
                notes: res || ''
              }, 'voice')}
            />

            {/* AI Severity Checker Card */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 transition-all duration-300 hover:shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 pointer-events-none"></div>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🩺</span>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Symptom Checker</h3>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg ml-auto">Instant Assessment</span>
                </div>
                <div className="flex gap-2">
                  <input
                    value={symptomInput}
                    onChange={e => setSymptomInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && symptomInput.trim()) {
                        const rf = checkRedFlags(symptomInput);
                        if (rf.triggered) {
                          setRedFlagAlert(rf.emergencyMessage);
                          setSeverityResult(null);
                        } else {
                          setSeverityResult(classifySeverityFromText(symptomInput));
                          setRedFlagAlert(null);
                        }
                      }
                    }}
                    placeholder="Describe your symptoms..."
                    className="flex-1 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-200/80 dark:border-gray-700/80 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm transition-all"
                  />
                  <button
                    onClick={() => {
                      if (!symptomInput.trim()) return;
                      const rf = checkRedFlags(symptomInput);
                      if (rf.triggered) {
                        setRedFlagAlert(rf.emergencyMessage);
                        setSeverityResult(null);
                      } else {
                        setSeverityResult(classifySeverityFromText(symptomInput));
                        setRedFlagAlert(null);
                      }
                    }}
                    className="px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  >
                    Check
                  </button>
                </div>
                {redFlagAlert && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl p-3 text-sm">
                    {redFlagAlert}
                    <div className="mt-2 flex gap-2">
                      <a href="tel:112" className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg">📞 Call 112</a>
                      <button onClick={() => setRedFlagAlert(null)} className="text-xs text-red-400 hover:text-red-500 underline">Dismiss</button>
                    </div>
                  </div>
                )}
                {severityResult && (
                  <SeverityBanner
                    result={severityResult}
                    symptoms={[symptomInput]}
                    onBookAppointment={() => setShowAppointments(true)}
                    onEmergency={() => setRedFlagAlert('🚨 Please call emergency services: 112 (India) / 911 (US)')}
                    onDismiss={() => setSeverityResult(null)}
                  />
                )}
              </div>
            </div>

            <VoiceSelector
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={handleVoiceChange}
              disabled={status !== SessionStatus.IDLE}
            />

            <ToolActivity activities={toolActivities} />

            <DoctorAvailability
              onSelectSlot={(_doctor, specialty, time) => {
                setShowAppointments(true);
              }}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <TranscriptionView entries={transcriptions} />
            <FollowUpMonitor appointments={appointments} patientName={userProfile.name} />
          </div>
        </div>
      </main>

      {/* Emergency SOS — only visible during active calls */}
      {status === SessionStatus.ACTIVE && <EmergencySOS />}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 z-40 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 px-5 py-3 rounded-xl shadow-sm max-w-sm no-print">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className="font-medium text-sm">Error</p>
              <p className="text-xs mt-0.5 text-red-500 dark:text-red-400">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-red-500 text-sm font-medium">✕</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white/50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800 py-4 text-center text-gray-400 dark:text-gray-500 text-xs no-print">
        <p>&copy; 2025 med_ai · For demonstration only. Always consult a healthcare professional.</p>
      </footer>

      {/* LoadDashboard Modal */}
      <LoadDashboard isOpen={showLoadDashboard} onClose={() => setShowLoadDashboard(false)} />

      {/* Modals */}
      <UserProfileModal
        profile={userProfile}
        onSave={handleSaveProfile}
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />

      <CallHistory
        sessions={sessions}
        onDelete={handleDeleteSession}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />

      <SessionSummary
        isOpen={showSummary}
        onClose={handleCloseSummary}
        onSave={handleSaveSession}
        duration={lastSessionDuration}
        transcriptions={transcriptions}
        toolCalls={toolActivities}
        language={language}
      />

      <AppointmentModal
        isOpen={showAppointments}
        onClose={() => setShowAppointments(false)}
        appointments={appointments}
        onBook={handleBookAppointment}
        onCancel={handleCancelAppointment}
        patientName={userProfile.name}
      />

      {/* Load Dashboard floating trigger */}
      <button
        onClick={() => setShowLoadDashboard(true)}
        className="fixed bottom-6 left-6 z-30 flex items-center gap-2 glass-panel hover:bg-white/90 dark:hover:bg-gray-800/90 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-4 py-3 rounded-2xl text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 no-print"
        title="Predictive Load Dashboard"
      >
        📊 Load Dashboard
      </button>
    </div>
  );
};

export default App;
