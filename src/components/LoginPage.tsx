import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { deriveAlphabetPosition } from '../crypto/visualCipher';
import {
  ShieldCheck,
  Lock,
  Key,
  User,
  Terminal,
  ArrowRight,
  PlusCircle,
  AlertTriangle,
  Loader2,
  Radio,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { RoomCreatedModal } from './RoomCreatedModal';
import { MagneticButton } from './MagneticButton';
import { TextScrambleReveal } from './TextScrambleReveal';
import { useCyberToast } from './CyberToast';

export const LoginPage: React.FC = () => {
  const {
    username,
    setUsername,
    handleJoinRoom,
    handleCreateRoom,
    enterSession,
    error,
    joinDiagnostics,
    clearError,
    isConnecting,
    setPreviewRoomCode,
  } = useChat();

  const { showToast } = useCyberToast();
  const [activeTab, setActiveTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [roomCode, setRoomCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [guestAccessCode, setGuestAccessCode] = useState('2266');
  const [createdRoomInfo, setCreatedRoomInfo] = useState<{
    roomCode: string;
    creatorAccessCode: string;
    guestAccessCode: string;
    activeSession: any;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Real-time calculation of Visual Cipher Derivation
  const liveDerivation = accessCode.length > 0 ? deriveAlphabetPosition(accessCode) : null;
  const liveGuestDerivation = guestAccessCode.length > 0 ? deriveAlphabetPosition(guestAccessCode) : null;

  // Input validation indicators (non-sensitive)
  const isUsernameValid = username.trim().length >= 2;
  const isRoomCodeValid = roomCode.trim().length >= 2;
  const isAccessCodeValid = /^\d{4}$/.test(accessCode.trim());
  const isGuestAccessCodeValid = /^\d{4}$/.test(guestAccessCode.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setStatusMessage(null);

    if (!username.trim()) {
      return;
    }

    if (activeTab === 'JOIN') {
      try {
        setStatusMessage('AUTHENTICATING ACCESS CREDENTIALS...');
        await handleJoinRoom(roomCode, accessCode);
        setStatusMessage('ACCESS GRANTED // ESTABLISHING SECURE SESSION...');
        showToast('> GUEST AUTHORIZED // CONNECTING...', 'SUCCESS');
      } catch {
        setStatusMessage(null);
      }
    } else {
      try {
        setStatusMessage('INITIALIZING 256-BIT ENCLAVE KEYWAY...');
        const cleanCode = roomCode.trim().toUpperCase();
        const cleanCreator = accessCode.trim();
        const cleanGuest = guestAccessCode.trim();
        const active = await handleCreateRoom(cleanCode, cleanCreator, cleanGuest);
        setStatusMessage(null);
        showToast('> ENCLAVE CREATED // CREDENTIALS READY', 'SECURITY');
        setCreatedRoomInfo({
          roomCode: cleanCode,
          creatorAccessCode: cleanCreator,
          guestAccessCode: cleanGuest,
          activeSession: active,
        });
      } catch {
        setStatusMessage(null);
      }
    }
  };

  return (
    <div className="relative z-10 flex min-h-[calc(100vh-65px)] items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl">
        {/* Terminal Header Telemetry */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono border-b border-cyber-border pb-2 px-1 text-cyber-muted">
          <div className="flex items-center gap-2">
            <span className="text-cyber-bright font-bold">NEXUS_NODE // SOC-CORE</span>
            <span className="text-cyber-darker">|</span>
            <span className="text-cyber-textMuted">PORT: SECURE_WSS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-cyber-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-cyber-primary animate-pulse-subtle" />
              SYSTEM ONLINE
            </span>
            <span className="flex items-center gap-1 text-cyber-textMuted">
              <Radio className="h-3 w-3 text-cyber-primary" />
              E2EE READY
            </span>
          </div>
        </div>

        {/* Central Terminal Console Panel */}
        <div className="hud-corners relative border border-[#00FF41]/35 bg-[#000803]/90 shadow-hud-panel backdrop-blur-xl transition-all duration-300">
          {/* Top Classified Console Bar */}
          <div className="flex items-center justify-between border-b border-cyber-border bg-cyber-surface px-4 py-2.5 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-cyber-primary" />
              <TextScrambleReveal
                text="NEXUS // SECURE COMMUNICATION TERMINAL"
                className="font-bold text-cyber-bright tracking-wider"
              />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-cyber-muted">
              <span>STATUS: <span className="text-cyber-primary font-bold">ONLINE</span></span>
              <span>•</span>
              <span>E2EE: <span className="text-cyber-primary font-bold">ON</span></span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Terminal Mode Switchers with Neon Underline Scan */}
            <div className="grid grid-cols-2 gap-2 mb-6 border border-cyber-border bg-cyber-surface p-1 relative">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('CREATE');
                  clearError();
                  setStatusMessage(null);
                }}
                className={`relative flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-mono font-bold transition-all cursor-pointer overflow-hidden ${
                  activeTab === 'CREATE'
                    ? 'bg-cyber-dark text-cyber-primary border border-cyber-borderBright shadow-terminal-glow-sm'
                    : 'text-cyber-muted hover:text-cyber-text hover:bg-cyber-card'
                }`}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>&gt; INITIALIZE ENCLAVE</span>
                {activeTab === 'CREATE' && (
                  <span aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00FF41] animate-tab-line" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('JOIN');
                  clearError();
                  setStatusMessage(null);
                }}
                className={`relative flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-mono font-bold transition-all cursor-pointer overflow-hidden ${
                  activeTab === 'JOIN'
                    ? 'bg-cyber-dark text-cyber-primary border border-cyber-borderBright shadow-terminal-glow-sm'
                    : 'text-cyber-muted hover:text-cyber-text hover:bg-cyber-card'
                }`}
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>&gt; CONNECT ENCLAVE</span>
                {activeTab === 'JOIN' && (
                  <span aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00FF41] animate-tab-line" />
                )}
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 border border-cyber-error/60 bg-cyber-error/10 p-3.5 text-xs text-cyber-error font-mono animate-fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold tracking-wider">SECURITY ALERT // ERROR:</span> {error}
                </div>
              </div>
            )}

            {/* Development Join Diagnostics Panel */}
            {activeTab === 'JOIN' && joinDiagnostics && error && (
              <div className="mb-5 border border-cyber-border bg-[#000d04]/90 p-3 text-[11px] font-mono space-y-1 text-cyber-muted animate-fade-in">
                <div className="text-cyber-bright font-bold border-b border-cyber-border pb-1 flex items-center justify-between text-[10px] uppercase">
                  <span>NEXUS // JOIN DIAGNOSTICS</span>
                  <span className="text-cyber-primary">TRANSPORT: {joinDiagnostics.transport}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10px]">
                  <div>Backend: <span className="text-cyber-text">{joinDiagnostics.supabaseConfigured ? `SUPABASE (${joinDiagnostics.supabaseHost})` : joinDiagnostics.transport === 'UNCONFIGURED_PRODUCTION' ? 'UNCONFIGURED (MISSING SUPABASE ENV)' : 'LOCAL DEV RELAY'}</span></div>
                  <div>Room Lookup: <span className={joinDiagnostics.roomFound ? 'text-cyber-primary font-bold' : 'text-cyber-error font-bold'}>{joinDiagnostics.roomFound ? '[✓] FOUND' : '[✗] NOT FOUND'}</span></div>
                  <div>Guest Verifier: <span className={joinDiagnostics.guestVerifierPresent ? 'text-cyber-primary' : 'text-cyber-muted'}>{joinDiagnostics.guestVerifierPresent ? '[✓] PRESENT' : '[✗] NONE'}</span></div>
                  <div>Session Salt: <span className={joinDiagnostics.sessionSaltPresent ? 'text-cyber-primary' : 'text-cyber-muted'}>{joinDiagnostics.sessionSaltPresent ? '[✓] PRESENT' : '[✗] NONE'}</span></div>
                  <div>Key Envelope: <span className={joinDiagnostics.guestWrappedKeyPresent ? 'text-cyber-primary' : 'text-cyber-muted'}>{joinDiagnostics.guestWrappedKeyPresent ? '[✓] PRESENT' : '[✗] NONE'}</span></div>
                  <div>Auth Check: <span className={joinDiagnostics.verifierResult === 'SUCCESS' ? 'text-cyber-primary font-bold' : joinDiagnostics.verifierResult === 'FAIL' ? 'text-cyber-error font-bold' : 'text-cyber-muted'}>{joinDiagnostics.verifierResult === 'SUCCESS' ? '[✓] SUCCESS' : joinDiagnostics.verifierResult === 'FAIL' ? '[✗] FAILED' : '[◌] PENDING'}</span></div>
                  <div>Key Unwrap: <span className={joinDiagnostics.unwrapResult === 'SUCCESS' ? 'text-cyber-primary font-bold' : joinDiagnostics.unwrapResult === 'FAIL' ? 'text-cyber-error font-bold' : 'text-cyber-muted'}>{joinDiagnostics.unwrapResult === 'SUCCESS' ? '[✓] SUCCESS' : joinDiagnostics.unwrapResult === 'FAIL' ? '[✗] FAILED' : '[◌] PENDING'}</span></div>
                </div>
              </div>
            )}

            {/* Status Progression Log */}
            {statusMessage && (
              <div className="mb-5 flex items-center gap-2.5 border border-cyber-borderBright bg-cyber-dark p-3 text-xs text-cyber-primary font-mono shadow-terminal-glow-sm animate-fade-in">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span className="tracking-wide">{statusMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              {/* Form Title */}
              <div className="flex items-center justify-between text-cyber-textMuted font-bold border-b border-cyber-border/80 pb-2">
                <span>{activeTab === 'CREATE' ? 'NEXUS // CREATE ENCLAVE' : 'NEXUS // JOIN ENCLAVE'}</span>
                <span className="text-[10px] text-cyber-muted uppercase">Protocol: AES-256-GCM</span>
              </div>

              {/* Username Input */}
              <div className="group">
                <label className="block text-cyber-muted mb-1 flex items-center justify-between transition-colors group-focus-within:text-cyber-primary">
                  <span className="flex items-center gap-1.5 font-bold text-cyber-text group-focus-within:text-[#39FF88]">
                    <User className="h-3.5 w-3.5 text-cyber-primary" /> USERNAME [OPERATOR IDENTIFIER]
                  </span>
                  <span className="text-[10px]">
                    {username.trim().length > 0 ? (
                      isUsernameValid ? (
                        <span className="text-cyber-primary font-bold">[✓]</span>
                      ) : (
                        <span className="text-cyber-error font-bold">[!]</span>
                      )
                    ) : (
                      <span className="text-cyber-muted">e.g. Bob or Lal</span>
                    )}
                  </span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-cyber-primary font-bold select-none">&gt;</span>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="Enter identity (e.g. Bob)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-terminal pl-8"
                  />
                </div>
              </div>

              {/* Room Code Input */}
              <div className="group">
                <label className="block text-cyber-muted mb-1 flex items-center justify-between transition-colors group-focus-within:text-cyber-primary">
                  <span className="flex items-center gap-1.5 font-bold text-cyber-text group-focus-within:text-[#39FF88]">
                    <Lock className="h-3.5 w-3.5 text-cyber-primary" /> ROOM CODE [CHANNEL IDENTIFIER]
                  </span>
                  <span className="text-[10px]">
                    {roomCode.trim().length > 0 ? (
                      isRoomCodeValid ? (
                        <span className="text-cyber-primary font-bold">[✓]</span>
                      ) : (
                        <span className="text-cyber-error font-bold">[!]</span>
                      )
                    ) : (
                      <span className="text-cyber-muted">Routing only (e.g. 434)</span>
                    )}
                  </span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-cyber-primary font-bold select-none">&gt;</span>
                  <input
                    type="text"
                    required
                    placeholder="Enter room code (e.g. 434)"
                    value={roomCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRoomCode(val);
                      setPreviewRoomCode(val.trim());
                    }}
                    className="input-terminal pl-8 uppercase tracking-wider font-bold"
                  />
                </div>
              </div>

              {/* Access Code Input */}
              <div className="group">
                <label className="block text-cyber-muted mb-1 flex items-center justify-between transition-colors group-focus-within:text-cyber-primary">
                  <span className="flex items-center gap-1.5 font-bold text-cyber-text group-focus-within:text-[#39FF88]">
                    <Key className="h-3.5 w-3.5 text-cyber-primary" />{' '}
                    {activeTab === 'CREATE' ? 'CREATOR ACCESS CODE (4 DIGITS)' : 'GUEST ROOM ACCESS CODE (4 DIGITS)'}
                  </span>
                  <span className="text-[10px]">
                    {accessCode.trim().length > 0 ? (
                      isAccessCodeValid ? (
                        <span className="text-cyber-primary font-bold">[✓] 4-DIGIT</span>
                      ) : (
                        <span className="text-cyber-error font-bold">[4-DIGIT REQUIRED]</span>
                      )
                    ) : (
                      <span className="text-cyber-primary font-bold">Authorizes Entry Only</span>
                    )}
                  </span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-cyber-primary font-bold select-none">&gt;</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    pattern="\d{4}"
                    placeholder="••••"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="input-terminal pl-8 tracking-widest text-center font-bold"
                  />
                </div>

                {/* Visual Cipher Derivation Preview */}
                {liveDerivation && liveDerivation.rawCode.length > 0 && (
                  <div className="mt-2 border border-cyber-border bg-cyber-surface p-2.5 text-[11px] text-cyber-muted animate-fade-in">
                    <div className="flex items-center justify-between text-cyber-bright">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-cyber-primary" /> Derived Visual Cipher Key:
                      </span>
                      <span className="text-cyber-primary font-bold">
                        Position {liveDerivation.finalPosition} [{liveDerivation.mappedLetter}]
                      </span>
                    </div>
                    <div className="text-[10px] text-cyber-muted mt-0.5">
                      Calculation: {liveDerivation.rawCode.split('').join('+')} = {liveDerivation.steps.join(' → ')} (Client HUD Caesar shift)
                    </div>
                  </div>
                )}
              </div>

              {/* Guest Join Access Code for Creator */}
              {activeTab === 'CREATE' && (
                <div className="pt-3 border-t border-cyber-border/60 group animate-fade-in">
                  <label className="block text-cyber-muted mb-1 flex items-center justify-between transition-colors group-focus-within:text-cyber-primary">
                    <span className="flex items-center gap-1.5 font-bold text-cyber-primary group-focus-within:text-[#39FF88]">
                      <Key className="h-3.5 w-3.5 text-cyber-primary" /> GUEST JOIN ACCESS CODE
                    </span>
                    <span className="text-[10px]">
                      {guestAccessCode.trim().length > 0 ? (
                        isGuestAccessCodeValid ? (
                          <span className="text-cyber-primary font-bold">[✓]</span>
                        ) : (
                          <span className="text-cyber-error font-bold">[4-DIGIT]</span>
                        )
                      ) : (
                        <span className="text-cyber-textMuted">Share with contact</span>
                      )}
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-cyber-primary font-bold select-none">&gt;</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      required
                      pattern="\d{4}"
                      placeholder="e.g. 2266"
                      value={guestAccessCode}
                      onChange={(e) => setGuestAccessCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="input-terminal pl-8 tracking-widest text-center text-cyber-primary font-bold"
                    />
                  </div>
                  {liveGuestDerivation && (
                    <div className="text-[10px] text-cyber-muted mt-1 text-right animate-fade-in">
                      Guest Visual Shift: Position {liveGuestDerivation.finalPosition} [{liveGuestDerivation.mappedLetter}]
                    </div>
                  )}
                  <div className="mt-2.5 p-2 border border-cyber-border bg-cyber-dark/40 text-[10px] text-cyber-muted leading-relaxed">
                    <span className="text-cyber-primary font-bold">SECURITY NOTICE:</span> Access codes authorize room entry only. The actual AES-256-GCM symmetric key is generated independently from native cryptographic randomness.
                  </div>
                </div>
              )}

              {/* Action Submit Button with Magnetic Feel & Data Trail */}
              <div className="pt-2">
                <MagneticButton
                  type="submit"
                  variant="bright"
                  disabled={isConnecting}
                  showDataTrail={true}
                  className="w-full py-3.5 text-xs"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>[ ◌ EXECUTING SECURITY PROTOCOL... ]</span>
                    </>
                  ) : activeTab === 'JOIN' ? (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>&gt; CONNECT TO ENCLAVE</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4" />
                      <span>&gt; INITIALIZE NEW ENCLAVE</span>
                    </>
                  )}
                </MagneticButton>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Classified Room Created Modal */}
      {createdRoomInfo && (
        <RoomCreatedModal
          roomCode={createdRoomInfo.roomCode}
          creatorAccessCode={createdRoomInfo.creatorAccessCode}
          guestAccessCode={createdRoomInfo.guestAccessCode}
          onEnterEnclave={() => {
            enterSession(createdRoomInfo.activeSession);
            setCreatedRoomInfo(null);
          }}
          onClose={() => setCreatedRoomInfo(null)}
        />
      )}
    </div>
  );
};
