import React from 'react';
import { useChat } from '../context/ChatContext';
import { ShieldCheck, X, Key, Lock, AlertTriangle, CheckCircle2, Terminal, Cpu } from 'lucide-react';
import { deriveAlphabetPosition } from '../crypto/visualCipher';
import { MagneticButton } from './MagneticButton';
import { TextScrambleReveal } from './TextScrambleReveal';

export const SecurityStatusModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { session, transportMode } = useChat();

  const userDerivation = session ? deriveAlphabetPosition(session.userAccessCode) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in font-mono text-xs">
      <div className="animate-modal-draw hud-corners relative w-full max-w-2xl border border-[#00FF41]/40 bg-[#000803]/95 p-6 sm:p-8 shadow-[0_0_35px_rgba(0,255,65,0.25)] max-h-[90vh] overflow-y-auto">
        {/* Top Console Bar */}
        <div className="flex items-center justify-between border-b border-cyber-border bg-cyber-surface px-4 py-2 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyber-primary" />
            <TextScrambleReveal
              text="NEXUS SECURITY AUDIT // CLASSIFIED ASSURANCE"
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

        {/* 4 Layers Technical Grid */}
        <div className="space-y-4">
          {/* Layer 01 */}
          <div className="stagger-row-1 border border-cyber-border bg-cyber-surface p-3.5 space-y-1">
            <div className="flex items-center justify-between border-b border-cyber-border/60 pb-1.5">
              <span className="text-cyber-primary font-bold">01 // ROOM IDENTIFIER</span>
              <span className="text-cyber-bright font-bold flex items-center gap-1">
                ROOM CODE <CheckCircle2 className="h-3.5 w-3.5 text-cyber-primary" />
              </span>
            </div>
            <div className="text-[11px] text-cyber-muted flex justify-between pt-1">
              <span>FUNCTION: ROUTING & ENCLAVE MAPPING ONLY</span>
              <span className="text-cyber-text font-bold">ENCRYPT_KEY: NO</span>
            </div>
          </div>

          {/* Layer 02 */}
          <div className="stagger-row-2 border border-cyber-border bg-cyber-surface p-3.5 space-y-1">
            <div className="flex items-center justify-between border-b border-cyber-border/60 pb-1.5">
              <span className="text-cyber-primary font-bold">02 // ACCESS CONTROL</span>
              <span className="text-cyber-bright font-bold flex items-center gap-1">
                SALTED SHA-256 VERIFIER <CheckCircle2 className="h-3.5 w-3.5 text-cyber-primary" />
              </span>
            </div>
            <div className="text-[11px] text-cyber-muted flex justify-between pt-1">
              <span>FUNCTION: AUTHORIZATION & MEMBERSHIP ENTRY</span>
              <span className="text-cyber-text font-bold">DECRYPT_KEY: NO</span>
            </div>
          </div>

          {/* Layer 03 */}
          <div className="stagger-row-3 border border-cyber-border bg-cyber-dark p-3.5 space-y-2 shadow-terminal-glow-sm">
            <div className="flex items-center justify-between border-b border-cyber-border pb-1.5">
              <span className="text-cyber-primary font-bold">03 // CRYPTOGRAPHIC LAYER</span>
              <span className="text-cyber-primary font-bold flex items-center gap-1">
                AES-256-GCM (256-BIT KEY) <CheckCircle2 className="h-3.5 w-3.5 text-cyber-primary" />
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex justify-between border-b border-cyber-border/40 py-1">
                <span className="text-cyber-muted">GENERATION:</span>
                <span className="text-cyber-bright font-bold">WebCrypto CSPRNG</span>
              </div>
              <div className="flex justify-between border-b border-cyber-border/40 py-1">
                <span className="text-cyber-muted">IV / NONCE:</span>
                <span className="text-cyber-bright font-bold">96-bit (Unique / Msg)</span>
              </div>
              <div className="flex justify-between border-b border-cyber-border/40 py-1">
                <span className="text-cyber-muted">PBKDF2 ROUNDS:</span>
                <span className="text-cyber-bright">100,000 (SHA-256)</span>
              </div>
              <div className="flex justify-between border-b border-cyber-border/40 py-1">
                <span className="text-cyber-muted">DB STORAGE:</span>
                <span className="text-cyber-primary font-bold">ZERO PLAINTEXT</span>
              </div>
            </div>
          </div>

          {/* Layer 04 */}
          <div className="stagger-row-4 border border-cyber-border bg-cyber-surface p-3.5 space-y-1">
            <div className="flex items-center justify-between border-b border-cyber-border/60 pb-1.5">
              <span className="text-cyber-primary font-bold">04 // PRESENTATION LAYER</span>
              <span className="text-cyber-bright font-bold flex items-center gap-1">
                VISUAL CIPHER (LOCAL ONLY) <CheckCircle2 className="h-3.5 w-3.5 text-cyber-primary" />
              </span>
            </div>
            <div className="text-[11px] text-cyber-muted pt-1">
              Deterministic Caesar transformation for presentation HUD (e.g. <span className="text-cyber-primary font-bold">amma ↔ pbbp</span>). Operating strictly in browser memory, explicitly separate from AES-GCM.
            </div>
            {userDerivation && (
              <div className="mt-2 p-2 border border-cyber-border bg-cyber-bg text-[10px] text-cyber-bright">
                Operator Shift: {userDerivation.rawCode} → Position {userDerivation.finalPosition} [{userDerivation.mappedLetter}]
              </div>
            )}
          </div>

          {/* Assurance Bottom Graphic */}
          <div className="border border-cyber-border bg-cyber-dark p-4 text-center space-y-2">
            <div className="text-[10px] text-cyber-muted uppercase tracking-widest font-bold">
              SECURITY STATUS MATRIX
            </div>
            <div className="text-cyber-primary text-xs font-bold tracking-widest truncate">
              ████████████████████████████████████████████████
            </div>
            <div className="text-sm font-bold text-cyber-bright tracking-widest">
              ● SYSTEM SECURE // ENCLAVE ARMED ●
            </div>
            <div className="text-cyber-primary text-xs font-bold tracking-widest truncate">
              ████████████████████████████████████████████████
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-cyber-muted pt-2 border-t border-cyber-border/40">
              <div>ROOM ACCESS: <span className="text-cyber-primary font-bold">SECURED</span></div>
              <div>CRYPTO: <span className="text-cyber-primary font-bold">ACTIVE</span></div>
              <div>DB STORAGE: <span className="text-cyber-primary font-bold">ZERO</span></div>
              <div>WIRE LEAK: <span className="text-cyber-primary font-bold">NONE</span></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <MagneticButton
            type="button"
            variant="bright"
            onClick={onClose}
            className="px-6 py-2.5"
          >
            [ DISMISS AUDIT CONSOLE ]
          </MagneticButton>
        </div>
      </div>
    </div>
  );
};
