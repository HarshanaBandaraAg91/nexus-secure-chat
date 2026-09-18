import React, { useEffect, useState } from 'react';
import { Terminal, Lock, ShieldCheck } from 'lucide-react';

interface PageTransitionProps {
  isTransitioning: boolean;
  targetRoomCode?: string;
  onComplete: () => void;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  isTransitioning,
  targetRoomCode = '444',
  onComplete,
}) => {
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    if (!isTransitioning) {
      setStep(0);
      return;
    }

    // Step 0: Scanline initialization (0ms)
    setStep(1);

    // Step 1: Verification & Boot sequence (140ms)
    const t1 = setTimeout(() => setStep(2), 140);

    // Step 2: Telemetry Loaded (280ms)
    const t2 = setTimeout(() => setStep(3), 280);

    // Step 3: Link Established & Room Reveal (420ms)
    const t3 = setTimeout(() => setStep(4), 420);

    // Step 4: Finish transition (560ms)
    const t4 = setTimeout(() => {
      onComplete();
    }, 560);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isTransitioning, onComplete]);

  if (!isTransitioning) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black font-mono select-none overflow-hidden"
    >
      {/* Laser horizontal scanline sweep */}
      <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00FF41] to-transparent animate-chat-scan" />

      {/* Cyber Grid Background */}
      <div className="absolute inset-0 terminal-grid opacity-40" />

      {/* Center Console Modal Frame */}
      <div className="relative z-10 hud-corners border border-[#00FF41]/50 bg-[#000a04]/95 p-6 sm:p-8 max-w-md w-[90%] shadow-[0_0_30px_rgba(0,255,65,0.3)] space-y-3">
        <div className="flex items-center justify-between border-b border-cyber-border pb-2 text-[11px] text-cyber-muted">
          <span className="flex items-center gap-1.5 text-cyber-primary font-bold">
            <Terminal className="h-3.5 w-3.5" /> NEXUS // ENCLAVE INITIALIZER
          </span>
          <span className="text-[#39FF88] font-bold">● ACTIVE</span>
        </div>

        {/* Boot Sequence Lines */}
        <div className="space-y-1.5 text-xs text-cyber-primary py-2">
          {step >= 1 && (
            <div className="flex items-center justify-between animate-fade-in">
              <span>&gt; INITIALIZING SECURE CHANNEL...</span>
              <span className="text-[#39FF88] font-bold">✓</span>
            </div>
          )}
          {step >= 2 && (
            <div className="flex items-center justify-between animate-fade-in">
              <span>&gt; VERIFYING ENCLAVE KEYWAY...</span>
              <span className="text-[#39FF88] font-bold">✓ 256-BIT</span>
            </div>
          )}
          {step >= 3 && (
            <div className="flex items-center justify-between animate-fade-in">
              <span>&gt; LOADING TELEMETRY MATRIX...</span>
              <span className="text-[#39FF88] font-bold">✓ READY</span>
            </div>
          )}
          {step >= 4 && (
            <div className="flex items-center justify-between text-[#39FF88] font-black border-t border-cyber-border pt-2 animate-fade-in">
              <span>&gt; LINK ESTABLISHED // ROOM {targetRoomCode}</span>
              <ShieldCheck className="h-4 w-4 text-[#00FF41]" />
            </div>
          )}
        </div>

        {/* Large Room Flash */}
        {step >= 4 && (
          <div className="text-center py-2 text-2xl font-bold text-cyber-bright tracking-widest animate-decrypt-reveal">
            ROOM // {targetRoomCode}
          </div>
        )}
      </div>
    </div>
  );
};
