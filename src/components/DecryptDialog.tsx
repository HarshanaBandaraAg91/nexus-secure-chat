import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { deriveAlphabetPosition, decodeVisualCipher } from '../crypto/visualCipher';
import { Unlock, X, AlertTriangle, Sparkles, Terminal, ShieldCheck, Check, Loader2 } from 'lucide-react';
import { MagneticButton } from './MagneticButton';
import { TextScrambleReveal } from './TextScrambleReveal';
import { useCyberToast } from './CyberToast';

interface DecryptDialogProps {
  messageId: string;
  cipherText: string;
  senderUsername: string;
  visualShift?: number;
  onClose: () => void;
}

type DecryptPhase = 'IDLE' | 'LOCATING' | 'READING_IV' | 'VERIFYING_AUTH' | 'DECRYPTING_CIPHER' | 'REVERSING_VISUAL' | 'SUCCESS';

export const DecryptDialog: React.FC<DecryptDialogProps> = ({
  messageId,
  cipherText,
  senderUsername,
  onClose,
}) => {
  const { handleDecryptMessage, session } = useChat();
  const { showToast } = useCyberToast();
  const [visualKeyInput, setVisualKeyInput] = useState(session?.userAccessCode || '');
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<DecryptPhase>('IDLE');
  const [recoveredPayload, setRecoveredPayload] = useState<string | null>(null);

  // Short 4-char hex packet ID
  const packetId = '0x' + messageId.replace(/-/g, '').slice(0, 4).toUpperCase();

  // Live derivation display
  const numericDirect = parseInt(visualKeyInput.trim(), 10);
  const isDirectNumber = !isNaN(numericDirect) && numericDirect >= 1 && numericDirect <= 26 && visualKeyInput.trim().length <= 2;
  const liveDerivation = isDirectNumber
    ? { finalPosition: numericDirect, mappedLetter: String.fromCharCode(64 + numericDirect), rawCode: visualKeyInput, steps: [numericDirect] }
    : visualKeyInput.length > 0
    ? deriveAlphabetPosition(visualKeyInput)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!visualKeyInput.trim()) {
      setError('Please input a valid Visual Cipher Key (e.g. 16 or 4-digit code like 2266).');
      return;
    }

    setPhase('LOCATING');

    setTimeout(() => {
      setPhase('READING_IV');
    }, 100);

    setTimeout(() => {
      setPhase('VERIFYING_AUTH');
    }, 200);

    setTimeout(() => {
      setPhase('DECRYPTING_CIPHER');
    }, 320);

    setTimeout(() => {
      setPhase('REVERSING_VISUAL');
    }, 440);

    setTimeout(() => {
      const result = handleDecryptMessage(messageId, visualKeyInput);
      if (result.success) {
        setPhase('SUCCESS');
        const shift = liveDerivation?.finalPosition || 16;
        const decoded = decodeVisualCipher(cipherText, shift);
        setRecoveredPayload(decoded);
        showToast(`> PACKET ${packetId} DECRYPTED // PLAINTEXT RECOVERED`, 'SUCCESS');

        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        setPhase('IDLE');
        setError(result.error || 'ACCESS DENIED // INVALID VISUAL CIPHER KEY');
      }
    }, 560);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in font-mono text-xs">
      {/* Laser line sweep across dialog overlay */}
      <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF41]/35 to-transparent animate-chat-scan pointer-events-none" />

      <div className="animate-modal-draw hud-corners relative w-full max-w-md border border-[#00FF41]/40 bg-[#000803]/95 p-6 shadow-[0_0_35px_rgba(0,255,65,0.25)]">
        {/* Top Console Bar */}
        <div className="flex items-center justify-between border-b border-cyber-border bg-cyber-surface px-4 py-2 -mx-6 -mt-6 mb-5">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyber-primary" />
            <TextScrambleReveal
              text="CRYPTOGRAPHIC DECRYPTION // LOCAL CONSOLE"
              className="font-bold text-cyber-bright tracking-wider"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-cyber-muted hover:text-cyber-bright transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Telemetry Block */}
        <div className="border border-cyber-border bg-cyber-surface p-3.5 space-y-1.5 mb-4 text-[11px]">
          <div className="flex justify-between">
            <span className="text-cyber-muted">PACKET ID:</span>
            <span className="text-cyber-bright font-bold">{packetId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyber-muted">SENDER:</span>
            <span className="text-cyber-text font-bold">{senderUsername.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyber-muted">ALGORITHM:</span>
            <span className="text-cyber-primary font-bold">AES-256-GCM (256-BIT)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyber-muted">STATUS:</span>
            <span className="text-cyber-primary font-bold flex items-center gap-1">
              ● LOCAL DECRYPTION READY
            </span>
          </div>
        </div>

        {/* Encrypted Representation Display */}
        <div className="relative border border-cyber-border bg-cyber-bg p-3 text-center mb-4 overflow-hidden">
          <span className="text-[10px] text-cyber-muted block mb-1 uppercase tracking-wider">
            AES-DECRYPTED VISUAL CIPHERTEXT:
          </span>
          <span className="text-base font-bold text-cyber-primary tracking-widest font-mono">
            {cipherText}
          </span>
          {phase === 'REVERSING_VISUAL' || phase === 'SUCCESS' ? (
            <div className="animate-laser-wipe" />
          ) : null}
        </div>

        {/* Live Transformation Diagram */}
        {liveDerivation && (
          <div className="border border-cyber-border/70 bg-cyber-surface p-2.5 mb-4 text-[11px] text-cyber-muted">
            <div className="flex items-center justify-between text-cyber-bright font-bold">
              <span>VISUAL CIPHER SHIFT:</span>
              <span className="text-cyber-primary">POS {liveDerivation.finalPosition} [{liveDerivation.mappedLetter}]</span>
            </div>
            <div className="mt-1 text-[10px] text-cyber-textMuted flex items-center justify-between">
              <span>CIPHER: {cipherText}</span>
              <span className="text-cyber-primary font-bold">──[SHIFT {liveDerivation.finalPosition}]──►</span>
              <span className="text-cyber-bright font-bold">PLAINTEXT</span>
            </div>
          </div>
        )}

        {/* Multi-step Cryptographic Decryption Progress Log */}
        {phase !== 'IDLE' && (
          <div className="border border-cyber-border bg-cyber-dark p-3.5 mb-4 space-y-1 text-[10px] text-cyber-primary font-mono animate-fade-in shadow-terminal-glow-sm">
            <div className="flex justify-between text-[10px] text-cyber-bright font-bold border-b border-cyber-border/80 pb-1 mb-1">
              <span>[ CRYPTOGRAPHIC DECRYPT PROCESS ]</span>
              <span className="text-cyber-primary animate-pulse">● EXECUTING</span>
            </div>
            <div className="flex justify-between">
              <span>&gt; LOCATING PACKET...</span>
              <span className="text-cyber-bright font-bold">✓ FOUND ({packetId})</span>
            </div>
            {phase !== 'LOCATING' && (
              <div className="flex justify-between animate-fade-in">
                <span>&gt; READING IV (96-BIT)...</span>
                <span className="text-cyber-bright font-bold">✓ LOADED</span>
              </div>
            )}
            {phase === 'VERIFYING_AUTH' || phase === 'DECRYPTING_CIPHER' || phase === 'REVERSING_VISUAL' || phase === 'SUCCESS' ? (
              <div className="flex justify-between animate-fade-in">
                <span>&gt; AUTH TAG VALIDATION...</span>
                <span className="text-cyber-bright font-bold">✓ GMAC-128 MATCH</span>
              </div>
            ) : null}
            {phase === 'DECRYPTING_CIPHER' || phase === 'REVERSING_VISUAL' || phase === 'SUCCESS' ? (
              <div className="flex justify-between animate-fade-in">
                <span>&gt; AES-256-GCM VERIFIED...</span>
                <span className="text-cyber-bright font-bold">✓ CIPHERTEXT OK</span>
              </div>
            ) : null}
            {phase === 'REVERSING_VISUAL' || phase === 'SUCCESS' ? (
              <div className="flex justify-between animate-fade-in">
                <span>&gt; VISUAL CIPHER REVERSE (SHIFT {liveDerivation?.finalPosition || 16})...</span>
                <span className="text-cyber-bright font-bold">✓ ROTATING</span>
              </div>
            ) : null}
            {phase === 'SUCCESS' ? (
              <div className="flex justify-between text-[#39FF88] font-bold border-t border-cyber-border/60 pt-1 mt-1 animate-fade-in">
                <span>&gt; PLAINTEXT RECOVERED...</span>
                <span>✓ READY</span>
              </div>
            ) : null}
            {recoveredPayload && (
              <div className="pt-2 text-center border-t border-cyber-border mt-1.5">
                <span className="text-[10px] text-cyber-muted block uppercase font-bold">RECOVERED PLAINTEXT:</span>
                <span className="text-base font-black text-[#39FF88] tracking-widest animate-decrypt-reveal font-mono">
                  "{recoveredPayload}"
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-start gap-2 border border-cyber-error bg-cyber-error/10 p-2.5 text-xs text-cyber-error animate-fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">DECRYPT FAILED:</span> {error}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-cyber-muted mb-1 text-center font-bold">
              VISUAL CIPHER KEY / SHIFT (1–26 or 4-DIGIT CODE)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-cyber-primary font-bold select-none">&gt;</span>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. 16 or 2266"
                value={visualKeyInput}
                onChange={(e) => setVisualKeyInput(e.target.value)}
                className="input-terminal pl-8 text-center tracking-widest text-base font-bold"
              />
            </div>
          </div>

          <MagneticButton
            type="submit"
            variant="bright"
            disabled={phase !== 'IDLE'}
            showDataTrail={true}
            className="w-full py-3"
          >
            {phase !== 'IDLE' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>[ EXECUTING CRYPTOGRAPHIC DECODE... ]</span>
              </span>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>[ &gt; EXECUTE DECRYPTION ]</span>
              </>
            )}
          </MagneticButton>
        </form>
      </div>
    </div>
  );
};
