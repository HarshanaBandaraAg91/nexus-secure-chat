import React, { useState } from 'react';
import { Copy, Check, Lock, Key, ArrowRight, Share2, Terminal, Shield } from 'lucide-react';
import { MagneticButton } from './MagneticButton';
import { useCyberToast } from './CyberToast';
import { TextScrambleReveal } from './TextScrambleReveal';

interface RoomCreatedModalProps {
  roomCode: string;
  creatorAccessCode: string;
  guestAccessCode: string;
  onEnterEnclave: () => void;
  onClose?: () => void;
}

export const RoomCreatedModal: React.FC<RoomCreatedModalProps> = ({
  roomCode,
  creatorAccessCode,
  guestAccessCode,
  onEnterEnclave,
  onClose,
}) => {
  const { showToast } = useCyberToast();
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [copiedCreator, setCopiedCreator] = useState(false);
  const [copiedGuest, setCopiedGuest] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyRoom = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedRoom(true);
    showToast(`> ROOM CODE [${roomCode}] COPIED TO CLIPBOARD`, 'SUCCESS');
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  const copyCreator = () => {
    navigator.clipboard.writeText(creatorAccessCode);
    setCopiedCreator(true);
    showToast('> CREATOR ACCESS CODE COPIED TO CLIPBOARD', 'SECURITY');
    setTimeout(() => setCopiedCreator(false), 2000);
  };

  const copyGuest = () => {
    navigator.clipboard.writeText(guestAccessCode);
    setCopiedGuest(true);
    showToast(`> GUEST ACCESS CODE [${guestAccessCode}] COPIED`, 'SUCCESS');
    setTimeout(() => setCopiedGuest(false), 2000);
  };

  const copyInvite = () => {
    const inviteText = `[ CLASSIFIED ENCLAVE ACCESS BRIEFING ]\n\nROOM CODE: ${roomCode}\nGUEST ACCESS CODE: ${guestAccessCode}\nSECURITY PROTOCOL: AES-256-GCM (Zero-Plaintext)\n\nPORTAL: ${window.location.origin}`;
    navigator.clipboard.writeText(inviteText);
    setCopiedAll(true);
    showToast('> FULL ACCESS BRIEFING COPIED TO CLIPBOARD', 'SECURITY');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in font-mono">
      {/* Thin horizontal scanline across modal background */}
      <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF41]/40 to-transparent animate-chat-scan pointer-events-none" />

      {/* Drawn Border Modal Panel */}
      <div className="animate-modal-draw hud-corners relative w-full max-w-lg border border-[#00FF41]/50 bg-[#000803]/95 p-6 sm:p-8 shadow-[0_0_35px_rgba(0,255,65,0.25)] text-xs">
        {/* Top Console Bar */}
        <div className="flex items-center justify-between border-b border-cyber-border bg-cyber-surface px-4 py-2.5 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-5">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyber-primary" />
            <TextScrambleReveal
              text="[ NEXUS ENCLAVE INITIALIZED ]"
              className="font-bold text-cyber-bright tracking-wider"
            />
          </div>
          <span className="text-[10px] text-cyber-primary font-bold">CLASSIFIED // LEVEL-4</span>
        </div>

        {/* Big Enclave Identifier Banner */}
        <div className="text-center pb-4 border-b border-cyber-border/80 stagger-row-1">
          <div className="text-[11px] text-cyber-muted tracking-widest uppercase mb-1">
            SECURE CHANNEL READY
          </div>
          <div className="text-3xl font-cyber font-bold text-cyber-bright tracking-wider">
            ENCLAVE #{roomCode}
          </div>

          {/* Status Matrix */}
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2.5 text-[10px] text-cyber-textMuted">
            <span className="flex items-center gap-1 text-cyber-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-cyber-primary animate-pulse-subtle" />
              CHANNEL PERSISTED
            </span>
            <span>•</span>
            <span className="text-cyber-bright">AES-256-GCM ACTIVE</span>
            <span>•</span>
            <span className="text-cyber-textMuted">MULTI-BROWSER READY</span>
          </div>
        </div>

        {/* Credentials Grid with Staggered Entrance */}
        <div className="mt-4 space-y-3">
          {/* Row 1: Room Code */}
          <div className="stagger-row-2 border border-cyber-border bg-cyber-surface p-3 flex items-center justify-between transition-all hover:border-[#00FF41]/60">
            <div>
              <span className="text-[10px] text-cyber-muted flex items-center gap-1.5 mb-0.5 uppercase tracking-wider font-bold">
                <Lock className="h-3.5 w-3.5 text-cyber-primary" /> ROOM CODE (IDENTIFIES ENCLAVE)
              </span>
              <span className="text-xl font-bold text-cyber-primary tracking-wider font-mono">
                {roomCode}
              </span>
            </div>
            <MagneticButton
              type="button"
              variant="terminal"
              onClick={copyRoom}
              className="py-1.5 px-3 text-xs"
            >
              {copiedRoom ? <Check className="h-3.5 w-3.5 text-cyber-primary" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedRoom ? 'COPIED ✓' : 'COPY'}</span>
            </MagneticButton>
          </div>

          {/* Row 2: Creator Access Code */}
          <div className="stagger-row-3 border border-cyber-border bg-cyber-surface p-3 flex items-center justify-between transition-all hover:border-[#00FF41]/60">
            <div>
              <span className="text-[10px] text-cyber-muted flex items-center gap-1.5 mb-0.5 uppercase tracking-wider font-bold">
                <Shield className="h-3.5 w-3.5 text-cyber-primary" /> CREATOR ACCESS CODE
              </span>
              <span className="text-xl font-bold text-cyber-text tracking-widest font-mono">
                {creatorAccessCode}
              </span>
              <div className="text-[9px] text-cyber-muted">Creator Access Code — keep private</div>
            </div>
            <MagneticButton
              type="button"
              variant="terminal"
              onClick={copyCreator}
              className="py-1.5 px-3 text-xs"
            >
              {copiedCreator ? <Check className="h-3.5 w-3.5 text-cyber-primary" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCreator ? 'COPIED ✓' : 'COPY'}</span>
            </MagneticButton>
          </div>

          {/* Row 3: Guest Room Access Code */}
          <div className="stagger-row-4 border border-cyber-borderBright bg-cyber-dark/80 p-3 flex items-center justify-between transition-all hover:border-[#39FF88] shadow-terminal-glow-sm">
            <div>
              <span className="text-[10px] text-cyber-primary flex items-center gap-1.5 mb-0.5 uppercase tracking-wider font-bold">
                <Key className="h-3.5 w-3.5 text-cyber-primary" /> GUEST ROOM ACCESS CODE
              </span>
              <span className="text-xl font-bold text-cyber-bright tracking-widest font-mono">
                {guestAccessCode}
              </span>
              <div className="text-[9px] text-cyber-primary">Share with the person joining this room</div>
            </div>
            <MagneticButton
              type="button"
              variant="bright"
              onClick={copyGuest}
              className="py-1.5 px-3 text-xs"
            >
              {copiedGuest ? <Check className="h-3.5 w-3.5 text-black" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedGuest ? 'COPIED ✓' : 'COPY'}</span>
            </MagneticButton>
          </div>

          {/* Share Guidance */}
          <div className="p-2.5 border border-cyber-border bg-cyber-dark/40 text-[10px] text-cyber-muted leading-relaxed">
            <span className="text-cyber-primary font-bold">INSTRUCTIONS:</span> Share BOTH the <strong className="text-cyber-text">Room Code</strong> and <strong className="text-cyber-bright">Guest Access Code</strong> with your peer.
            <div className="mt-1 flex items-center justify-between text-[9px] text-cyber-textMuted border-t border-cyber-border/40 pt-1">
              <span>• Room Code → identifies enclave</span>
              <span>• Access Code → authorizes entry</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
          <MagneticButton
            type="button"
            variant="terminal"
            onClick={copyInvite}
            className="w-full sm:w-1/2 py-3"
          >
            {copiedAll ? <Check className="h-4 w-4 text-cyber-primary" /> : <Share2 className="h-4 w-4" />}
            <span>{copiedAll ? 'BRIEFING COPIED ✓' : 'COPY BRIEFING'}</span>
          </MagneticButton>
          <MagneticButton
            type="button"
            variant="bright"
            onClick={onEnterEnclave}
            className="w-full sm:w-1/2 py-3"
          >
            <span>[ ENTER ENCLAVE ]</span>
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </div>
      </div>
    </div>
  );
};
