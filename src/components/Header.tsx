import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import {
  ShieldCheck,
  Volume2,
  VolumeX,
  LogOut,
  Copy,
  Check,
  Cpu,
  Eye,
  EyeOff,
  Radio,
  Terminal,
  Binary,
} from 'lucide-react';
import { SecurityStatusModal } from './SecurityStatusModal';
import { WireInspectorModal } from './WireInspectorModal';
import { MagneticButton } from './MagneticButton';
import { TextScrambleReveal } from './TextScrambleReveal';
import { useCyberToast } from './CyberToast';

export const Header: React.FC = () => {
  const {
    session,
    username,
    messages,
    transportMode,
    isMuted,
    toggleMute,
    autoDecryptWithSessionSS,
    toggleAutoDecrypt,
    handleLeaveRoom,
  } = useChat();

  const { showToast } = useCyberToast();
  const [copied, setCopied] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showWireModal, setShowWireModal] = useState(false);

  const copyRoomCode = () => {
    if (session?.roomCode) {
      navigator.clipboard.writeText(session.roomCode);
      setCopied(true);
      showToast(`> ROOM CODE [${session.roomCode}] COPIED TO CLIPBOARD`, 'SUCCESS');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Select last message for wire inspection if triggered from header
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <>
      <header className="relative z-20 w-full border-b border-cyber-border bg-cyber-bg/95 backdrop-blur-md px-3 py-2.5 sm:px-6 font-mono text-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          {/* Tactical Brand & HUD Channel Telemetry */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-cyber-border bg-cyber-surface text-cyber-primary shadow-terminal-glow-sm">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cyber text-sm font-bold tracking-widest text-cyber-bright sm:text-base">
                  NEXUS <span className="text-cyber-primary">//</span> ENCRYPTED CHANNEL
                </span>
                <span className="hidden items-center gap-1.5 border border-cyber-border bg-cyber-surface px-2 py-0.5 text-[10px] text-cyber-primary sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyber-primary animate-pulse-subtle" />
                  STATUS: SECURE
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-cyber-muted mt-0.5">
                <span>NODE: <span className="text-cyber-bright font-bold">NX-{session?.roomCode || 'GLOBAL'}</span></span>
                <span className="text-cyber-darker">|</span>
                <span>E2EE: <span className="text-cyber-primary font-bold">AES-256-GCM</span></span>
                <span className="text-cyber-darker">|</span>
                <span className="text-cyber-textMuted flex items-center gap-1">
                  <span>LINK:</span>
                  <span className="flex items-end gap-0.5 inline-flex ml-0.5">
                    <span className="signal-bar signal-bar-1" />
                    <span className="signal-bar signal-bar-2" />
                    <span className="signal-bar signal-bar-3" />
                    <span className="signal-bar signal-bar-4" />
                  </span>
                  <span className="text-cyber-primary font-bold">STABLE</span>
                </span>
              </div>
            </div>
          </div>

          {/* Tactical Control Bar */}
          {session && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Room Identifier Button */}
              <MagneticButton
                type="button"
                variant="terminal"
                onClick={copyRoomCode}
                title="Click to copy Room Code"
                className="py-1.5 px-2.5 text-[11px] flex items-center gap-1.5"
              >
                <span className="text-cyber-muted">ROOM:</span>
                <span className="font-bold text-cyber-bright">{session.roomCode}</span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-cyber-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-cyber-muted" />
                )}
              </MagneticButton>

              {/* Operator Identity */}
              <div className="hidden items-center gap-1.5 border border-cyber-border bg-cyber-surface px-2.5 py-1.5 text-[11px] text-cyber-text md:flex">
                <span className="text-cyber-muted">USER:</span>
                <span className="font-bold text-cyber-bright">{username}</span>
                <span className="text-cyber-primary text-[10px]">[{session.role}]</span>
              </div>

              {/* Auto Decrypt Toggle */}
              <MagneticButton
                type="button"
                variant={autoDecryptWithSessionSS ? 'terminal' : 'terminal'}
                onClick={toggleAutoDecrypt}
                title={
                  autoDecryptWithSessionSS
                    ? 'Auto-decrypt visual cipher using session access shift'
                    : 'Manual visual cipher decryption mode'
                }
                className={`flex items-center gap-1.5 py-1.5 px-2.5 text-[11px] ${
                  autoDecryptWithSessionSS
                    ? 'border-cyber-borderBright bg-cyber-dark text-cyber-primary shadow-terminal-glow-sm'
                    : 'text-cyber-muted'
                }`}
              >
                {autoDecryptWithSessionSS ? (
                  <>
                    <Eye className="h-3.5 w-3.5 text-cyber-primary" />
                    <span className="hidden lg:inline">AUTO-DECRYPT: ON</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">MANUAL DECRYPT</span>
                  </>
                )}
              </MagneticButton>

              {/* Security Audit Modal Trigger */}
              <MagneticButton
                type="button"
                variant="terminal"
                onClick={() => setShowSecurityModal(true)}
                title="View Cryptographic Security Audit"
                className="py-1.5 px-2.5 text-[11px] flex items-center gap-1"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-cyber-primary" />
                <span>[ AUDIT ]</span>
              </MagneticButton>

              {/* Wire Inspector Header Button */}
              {latestMessage && (
                <MagneticButton
                  type="button"
                  variant="terminal"
                  onClick={() => setShowWireModal(true)}
                  title="Inspect Latest Transmitted Wire Packet"
                  className="py-1.5 px-2.5 text-[11px] hidden sm:flex items-center gap-1"
                >
                  <Binary className="h-3.5 w-3.5 text-cyber-primary" />
                  <span>[ WIRE ]</span>
                </MagneticButton>
              )}

              {/* Audio SFX Toggle */}
              <MagneticButton
                type="button"
                variant="terminal"
                onClick={toggleMute}
                title={isMuted ? 'Unmute tactical audio cues' : 'Mute tactical audio cues'}
                className="py-1.5 px-2 text-[11px]"
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5 text-cyber-error" /> : <Volume2 className="h-3.5 w-3.5 text-cyber-primary" />}
              </MagneticButton>

              {/* Leave Session Button */}
              <MagneticButton
                type="button"
                variant="danger"
                onClick={handleLeaveRoom}
                title="Disconnect from enclave session"
                className="py-1.5 px-2.5 text-[11px] flex items-center gap-1"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">[ EXIT ]</span>
              </MagneticButton>
            </div>
          )}
        </div>
      </header>

      {/* Security Audit Modal */}
      {showSecurityModal && (
        <SecurityStatusModal onClose={() => setShowSecurityModal(false)} />
      )}

      {/* Wire Inspector Modal */}
      {showWireModal && latestMessage && (
        <WireInspectorModal
          message={latestMessage}
          onClose={() => setShowWireModal(false)}
        />
      )}
    </>
  );
};
