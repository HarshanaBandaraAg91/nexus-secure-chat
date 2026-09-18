import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { deriveAlphabetPosition, encodeVisualCipher } from '../crypto/visualCipher';
import { Send, Shield, Sparkles, Terminal, Loader2, Check } from 'lucide-react';
import { soundEffects } from '../lib/soundEffects';
import { MagneticButton } from './MagneticButton';

export const MessageInput: React.FC = () => {
  const { handleSendMessage, session, transmitStage } = useChat();
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Compute live visual cipher transformation
  const userDerivation = session ? deriveAlphabetPosition(session.userAccessCode) : null;
  const liveVisualCipherText =
    userDerivation && inputText.trim()
      ? encodeVisualCipher(inputText, userDerivation.finalPosition)
      : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || transmitStage !== 'IDLE') return;

    const textToSend = inputText;
    setInputText('');

    try {
      await handleSendMessage(textToSend);
    } catch (err) {
      console.error('Transmission error:', err);
      setInputText(textToSend);
    } finally {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = () => {
    soundEffects.playKeyClick();
  };

  return (
    <div className="relative z-10 w-full border-t border-cyber-border bg-[#000803]/95 p-3.5 sm:p-4 backdrop-blur-md font-mono text-xs">
      <div className="mx-auto max-w-4xl space-y-2">
        {/* Live Transformation Preview Drawer */}
        {inputText.trim().length > 0 && userDerivation && (
          <div className="flex flex-wrap items-center justify-between gap-2 border border-cyber-border bg-cyber-surface px-3 py-1.5 animate-fade-in text-[11px]">
            <div className="flex items-center gap-2 truncate">
              <span className="text-cyber-muted flex items-center gap-1 font-bold">
                <Sparkles className="h-3.5 w-3.5 text-cyber-primary" />
                TX_TRANSFORMATION:
              </span>
              <span className="text-cyber-bright font-bold">"{inputText}"</span>
              <span className="text-cyber-primary">──[POS {userDerivation.finalPosition}/{userDerivation.mappedLetter}]──►</span>
              <span className="text-cyber-primary font-bold tracking-wider truncate">"{liveVisualCipherText}"</span>
            </div>
            <div className="shrink-0 text-[10px] text-cyber-muted font-bold flex items-center gap-1 border-l border-cyber-border pl-2">
              <Shield className="h-3 w-3 text-cyber-primary" />
              <span>AES-256-GCM ARMED</span>
            </div>
          </div>
        )}

        {/* Transmission Progression Banner */}
        {transmitStage === 'DELIVERED' && (
          <div className="flex items-center gap-1.5 text-[11px] text-cyber-primary animate-fade-in font-bold">
            <Check className="h-3.5 w-3.5 text-cyber-bright animate-ping" />
            <span>✓ PACKET DELIVERED // ZERO PLAINTEXT TRANSMITTED</span>
          </div>
        )}

        {/* Input Form Terminal */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-cyber-primary font-bold">
              &gt;
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ENTER SECURE MESSAGE..."
              className="input-terminal pl-8 py-3"
            />
          </div>

          <MagneticButton
            type="submit"
            variant="bright"
            disabled={!inputText.trim() || transmitStage !== 'IDLE'}
            showDataTrail={true}
            className="py-3 px-6 text-xs whitespace-nowrap min-w-[210px]"
          >
            {transmitStage === 'PACKET_BUILDING' ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-black animate-ping" />
                <span>● PACKET BUILDING</span>
              </span>
            ) : transmitStage === 'AES_ENCRYPTING' ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>● AES-256 ENCRYPTING</span>
              </span>
            ) : transmitStage === 'IN_TRANSIT' ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-black animate-pulse" />
                <span>● PACKET IN TRANSIT</span>
              </span>
            ) : transmitStage === 'DELIVERED' ? (
              <span className="flex items-center gap-2 text-black font-black">
                <Check className="h-4 w-4" />
                <span>✓ PACKET DELIVERED</span>
              </span>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>[ &gt; ENCRYPT + TRANSMIT ]</span>
              </>
            )}
          </MagneticButton>
        </form>

        {/* Bottom Status Bar */}
        <div className="flex flex-wrap items-center justify-between text-[10px] text-cyber-muted pt-1 px-1">
          <div className="flex items-center gap-3">
            <span>VISUAL CIPHER: <span className="text-cyber-bright font-bold">POS {userDerivation?.finalPosition || 1} [{userDerivation?.mappedLetter || 'A'}]</span></span>
            <span className="text-cyber-darker">|</span>
            <span>AES-256-GCM: <span className="text-cyber-primary font-bold">READY</span></span>
            <span className="text-cyber-darker">|</span>
            <span>CHANNEL: <span className="text-cyber-primary font-bold">SECURE</span></span>
          </div>
          <div className="hidden sm:block text-cyber-textMuted">
            PRESS [ENTER] TO TRANSMIT
          </div>
        </div>
      </div>
    </div>
  );
};
