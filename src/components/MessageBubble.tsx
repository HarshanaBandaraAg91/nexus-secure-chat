import React, { useState, useEffect } from 'react';
import { ProcessedChatMessage } from '../services/messageService';
import { Unlock, Lock, ShieldCheck, Clock, CheckCheck, Binary, Terminal, Shield, Cpu } from 'lucide-react';
import { DecryptDialog } from './DecryptDialog';
import { WireInspectorModal } from './WireInspectorModal';
import { MagneticButton } from './MagneticButton';

interface MessageBubbleProps {
  message: ProcessedChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [showDecryptDialog, setShowDecryptDialog] = useState(false);
  const [showWireInspector, setShowWireInspector] = useState(false);
  const [isMaterialized, setIsMaterialized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMaterialized(true), 280);
    return () => clearTimeout(timer);
  }, []);

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Short 4-char hex packet ID derived from message UUID
  const packetId = '0x' + message.id.replace(/-/g, '').slice(0, 4).toUpperCase();

  const displayText = (message.isVisualDecrypted
    ? message.visualDecryptedText || message.aesDecryptedText
    : message.aesDecryptedText || '[ENCRYPTED_PACKET]') ?? '[ENCRYPTED_PACKET]';

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex flex-col ${
          message.isSelf ? 'items-end' : 'items-start'
        } mb-4 font-mono text-xs ${
          message.isSelf ? 'animate-msg-tx' : 'animate-msg-rx'
        }`}
      >
        {/* Terminal Packet Frame with Directional Accents & Hover Expansion */}
        <div
          className={`hud-corners w-full max-w-[94%] sm:max-w-lg border transition-all duration-200 ${
            message.isSelf
              ? isHovered
                ? 'border-[#39FF88] border-r-2 border-r-[#39FF88] bg-[#001307]/95 shadow-[0_0_20px_rgba(0,255,65,0.25)]'
                : 'border-cyber-border border-r-2 border-r-cyber-primary bg-[#000e05]/95 shadow-[0_0_15px_rgba(0,255,65,0.12)]'
              : isHovered
              ? 'border-[#00FF41] border-l-2 border-l-[#39FF88] bg-[#001005]/95 shadow-[0_0_20px_rgba(0,255,65,0.20)]'
              : 'border-cyber-border border-l-2 border-l-[#00FF41] bg-[#000803]/95 shadow-[0_0_10px_rgba(0,255,65,0.08)]'
          }`}
        >
          {/* Packet Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyber-border bg-cyber-bgDark px-3.5 py-2 text-[10px] text-cyber-muted">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${message.isSelf ? 'text-cyber-primary' : 'text-cyber-bright'}`}>
                {message.isSelf ? '>>> TX >' : '<<< RX <'} USER: {message.isSelf ? 'YOU' : message.senderUsername.toUpperCase()}
              </span>
              <span className="text-cyber-darker">|</span>
              <span className="text-cyber-textMuted font-bold">PKT: {packetId}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-cyber-muted">
                <Clock className="h-3 w-3" />
                {formattedTime}
              </span>
              <span className="border border-cyber-border px-1.5 py-0.5 text-[9px] text-cyber-primary font-bold bg-[#000803]">
                ✓ AES-256-GCM
              </span>
            </div>
          </div>

          {/* Packet Body */}
          <div className="p-4">
            {!isMaterialized && !message.isSelf ? (
              <div className="py-1 text-[11px] text-cyber-muted animate-pulse font-mono flex items-center justify-between">
                <span>[ RECEIVING PACKET: {packetId} ]</span>
                <span className="text-cyber-primary font-bold">████████░░░░</span>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="break-words leading-relaxed whitespace-pre-wrap flex-1">
                  <span className="text-cyber-muted mr-2 select-none font-bold">&gt;</span>
                  {message.isVisualDecrypted ? (
                    <span className="text-cyber-bright font-bold tracking-wide animate-decrypt-reveal">
                      {displayText}
                    </span>
                  ) : (
                    <span className="text-cyber-primary font-bold tracking-wider">
                      {displayText}
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                <div className="shrink-0 mt-0.5">
                  {message.isVisualDecrypted ? (
                    <span title="Plaintext Payload Recovered" className="inline-flex">
                      <ShieldCheck className="h-4 w-4 text-cyber-primary animate-pulse-subtle" />
                    </span>
                  ) : (
                    <span title="Encrypted Wire Packet" className="inline-flex">
                      <Lock className="h-4 w-4 text-cyber-muted" />
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Hover HUD Telemetry Expansion (Safe Metadata Only) */}
            <div
              className={`transition-all duration-200 overflow-hidden text-[9px] font-mono text-cyber-muted ${
                isHovered ? 'max-h-12 opacity-100 mt-2.5 pt-2 border-t border-cyber-border/40' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-cyber-textMuted">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-cyber-primary" />
                  <span>INTEGRITY: <strong className="text-cyber-primary">GMAC-128 ✓</strong></span>
                </span>
                <span>NONCE: <strong className="text-cyber-bright">96-BIT OK</strong></span>
                <span>WIRE STATUS: <strong className="text-cyber-primary">ZERO PLAINTEXT</strong></span>
              </div>
            </div>

            {/* Packet Action Controls */}
            <div className="mt-3 pt-2.5 border-t border-cyber-border/60 flex flex-wrap items-center justify-between gap-2 text-[10px]">
              {/* Decrypt Button */}
              {!message.isVisualDecrypted && !message.isSelf ? (
                <MagneticButton
                  type="button"
                  variant="bright"
                  onClick={() => setShowDecryptDialog(true)}
                  className="py-1 px-3 text-[11px]"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>[ 🔓 DECRYPT ]</span>
                </MagneticButton>
              ) : message.isVisualDecrypted ? (
                <div className="flex items-center gap-1.5 text-cyber-primary font-bold">
                  <CheckCheck className="h-3.5 w-3.5 text-cyber-bright" />
                  <span>PLAINTEXT RECOVERED // GMAC-128 ✓</span>
                </div>
              ) : (
                <div className="text-cyber-muted text-[10px]">TX ENCRYPTED WIRE PACKET</div>
              )}

              {/* Wire Inspector Button */}
              <MagneticButton
                type="button"
                variant="terminal"
                onClick={() => setShowWireInspector(true)}
                className="py-1 px-2.5 text-[10px]"
              >
                <Binary className="h-3 w-3 text-cyber-primary" />
                <span>[ INSPECT WIRE ]</span>
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>

      {/* Wire Inspector Modal */}
      {showWireInspector && (
        <WireInspectorModal
          message={message}
          onClose={() => setShowWireInspector(false)}
        />
      )}

      {/* Decrypt Dialog Console */}
      {showDecryptDialog && (
        <DecryptDialog
          messageId={message.id}
          cipherText={displayText}
          senderUsername={message.senderUsername}
          visualShift={message.visualShift}
          onClose={() => setShowDecryptDialog(false)}
        />
      )}
    </>
  );
};
