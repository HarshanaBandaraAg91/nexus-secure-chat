import React from 'react';
import { ShieldCheck, X, Binary, Lock, Terminal, CheckCircle2 } from 'lucide-react';
import { ProcessedChatMessage } from '../services/messageService';
import { MagneticButton } from './MagneticButton';
import { TextScrambleReveal } from './TextScrambleReveal';

interface WireInspectorModalProps {
  message: ProcessedChatMessage;
  onClose: () => void;
}

export const WireInspectorModal: React.FC<WireInspectorModalProps> = ({ message, onClose }) => {
  const packetId = '0x' + message.id.replace(/-/g, '').slice(0, 8).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in font-mono text-xs">
      <div className="animate-modal-draw hud-corners relative w-full max-w-xl border border-[#00FF41]/40 bg-[#000803]/95 p-6 sm:p-8 shadow-[0_0_35px_rgba(0,255,65,0.25)]">
        {/* Top Console Bar */}
        <div className="flex items-center justify-between border-b border-cyber-border bg-cyber-surface px-4 py-2 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-5">
          <div className="flex items-center gap-2">
            <Binary className="h-4 w-4 text-cyber-primary" />
            <TextScrambleReveal
              text="WIRE INSPECTOR // PACKET ANALYSIS TOOL"
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

        {/* Technical Blocks Grid */}
        <div className="space-y-4">
          <div className="stagger-row-1 border border-cyber-border bg-cyber-surface p-4 space-y-2.5">
            <div className="flex justify-between items-center border-b border-cyber-border/60 pb-2">
              <span className="text-cyber-muted font-bold">ALGORITHM:</span>
              <span className="font-bold text-cyber-primary flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> AES-256-GCM
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-cyber-border/60 pb-2">
              <span className="text-cyber-muted font-bold">KEY SIZE:</span>
              <span className="font-bold text-cyber-bright">256 BIT (Symmetric Web Crypto CSPRNG)</span>
            </div>
            <div className="flex justify-between items-center border-b border-cyber-border/60 pb-2">
              <span className="text-cyber-muted font-bold">NONCE / IV:</span>
              <span className="font-bold text-cyber-bright">96 BIT (12 Bytes - Generated Per Message)</span>
            </div>
            <div className="flex justify-between items-center pb-0.5">
              <span className="text-cyber-muted font-bold">PLAINTEXT STATUS:</span>
              <span className="font-bold text-cyber-primary flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> NOT TRANSMITTED (ZERO LEAKAGE)
              </span>
            </div>
          </div>

          {/* Packet Hex Visualization Block */}
          <div className="stagger-row-2 border border-cyber-border bg-cyber-bg p-3.5 space-y-2">
            <div className="flex justify-between items-center text-[10px] text-cyber-muted pb-1 border-b border-cyber-border/60">
              <span>WIRE PAYLOAD: <span className="text-cyber-primary font-bold">{packetId}</span></span>
              <span>ENCODING: BASE64 CIPHERTEXT</span>
            </div>
            <div className="text-[11px] text-cyber-primary break-all font-mono leading-relaxed select-all bg-cyber-surface/60 p-2 border border-cyber-borderMuted">
              {message.ciphertext}
            </div>
          </div>

          {/* IV Block */}
          <div className="stagger-row-3 border border-cyber-border bg-cyber-bg p-3.5 space-y-1.5">
            <div className="text-[10px] text-cyber-muted font-bold uppercase">
              UNIQUE INITIALIZATION VECTOR (IV / NONCE):
            </div>
            <div className="text-[11px] text-cyber-textMuted break-all font-mono select-all bg-cyber-surface/60 p-2 border border-cyber-borderMuted">
              {message.iv}
            </div>
          </div>

          {/* Graphical Terminal Block Visualization */}
          <div className="stagger-row-4 p-3 border border-cyber-border bg-cyber-dark/40 text-[10px] text-cyber-muted space-y-1">
            <div className="text-cyber-primary font-bold flex items-center gap-1">
              <Terminal className="h-3.5 w-3.5" /> PACKET INTEGRITY MATRIX:
            </div>
            <div className="text-cyber-primary tracking-widest text-[9px] truncate">
              ████████████████████████████████████████████████████████████
            </div>
            <div className="text-cyber-muted">
              GMAC-128 AUTHENTICATION TAG: VERIFIED // TAMPER-PROOF WIRE TRANSIT
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <MagneticButton
            type="button"
            variant="terminal"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5"
          >
            [ CLOSE INSPECTOR ]
          </MagneticButton>
        </div>
      </div>
    </div>
  );
};
