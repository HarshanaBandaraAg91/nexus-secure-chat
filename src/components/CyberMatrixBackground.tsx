import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';

interface Stream {
  x: number;
  y: number;
  speed: number;
  direction: 1 | -1; // 1 = TOP -> BOTTOM, -1 = BOTTOM -> TOP
  length: number;
  depth: 0 | 1 | 2; // 0 = DIM, 1 = MEDIUM, 2 = NEON
  fontSize: number;
  color: string;
  baseOpacity: number;
  digits: string[];
  roomInjectionIndex: number;
  hasRoomInjection: boolean;
  mutationSpeed: number;
}

const PALETTE = {
  DIM: '#064D26',
  MEDIUM: '#0A8F45',
  BRIGHT: '#00CC55',
  NEON: '#00FF41',
  HIGHLIGHT: '#39FF88',
};

export const CyberMatrixBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { activeRoomCode, pulseTrigger } = useChat();
  const roomCodeRef = useRef<string>(activeRoomCode);
  const burstEnergyRef = useRef<number>(0);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const [isPulseActive, setIsPulseActive] = useState<boolean>(false);

  useEffect(() => {
    roomCodeRef.current = activeRoomCode;
  }, [activeRoomCode]);

  useEffect(() => {
    if (pulseTrigger > 0) {
      burstEnergyRef.current = 1.0;
      setIsPulseActive(true);
      const timer = setTimeout(() => setIsPulseActive(false), 750);
      return () => clearTimeout(timer);
    }
  }, [pulseTrigger]);

  // Global mouse move listener for subtle parallax and proximity
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      // Update root CSS variables for workspace mouse follow glow
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);

      // Calculate subtle HUD parallax (max 6px)
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const tiltX = (e.clientX / window.innerWidth - 0.5) * 8;
        const tiltY = (e.clientY / window.innerHeight - 0.5) * 8;
        setParallaxOffset({ x: tiltX, y: tiltY });
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let isTabVisible = true;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStreams();
    };

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let streams: Stream[] = [];

    const createStream = (colIndex: number, colWidth: number): Stream => {
      const randDepth = Math.random();
      let depth: 0 | 1 | 2 = 0;
      let fontSize = 11;
      let speed = Math.random() * 0.5 + 0.5;
      let color = PALETTE.DIM;
      let baseOpacity = Math.random() * 0.25 + 0.25;

      if (randDepth > 0.85) {
        depth = 2;
        fontSize = 15;
        speed = Math.random() * 1.4 + 2.0;
        color = PALETTE.NEON;
        baseOpacity = Math.random() * 0.2 + 0.8;
      } else if (randDepth > 0.45) {
        depth = 1;
        fontSize = 13;
        speed = Math.random() * 0.9 + 1.1;
        color = PALETTE.MEDIUM;
        baseOpacity = Math.random() * 0.25 + 0.55;
      }

      const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
      const length = Math.floor(Math.random() * 16) + 12;

      const streamDigits: string[] = [];
      for (let i = 0; i < length; i++) {
        streamDigits.push(NUMBERS[Math.floor(Math.random() * NUMBERS.length)]);
      }

      const x = colIndex * colWidth + (Math.random() * 4 - 2);
      const y = Math.random() * (height + 400) - 200;

      const hasRoomInjection = Math.random() < 0.4;
      const roomInjectionIndex = Math.floor(Math.random() * Math.max(1, length - 4));

      return {
        x,
        y,
        speed,
        direction,
        length,
        depth,
        fontSize,
        color,
        baseOpacity,
        digits: streamDigits,
        roomInjectionIndex,
        hasRoomInjection,
        mutationSpeed: Math.random() * 0.05 + 0.015,
      };
    };

    const initStreams = () => {
      const colWidth = 14;
      const columns = Math.ceil(width / colWidth);
      streams = [];
      for (let i = 0; i < columns; i++) {
        streams.push(createStream(i, colWidth));
        if (Math.random() < 0.4) {
          streams.push(createStream(i, colWidth));
        }
      }
    };

    initStreams();

    let lastTime = performance.now();

    const render = (time: number) => {
      animationFrameId = requestAnimationFrame(render);

      if (!isTabVisible) return;

      const delta = Math.min((time - lastTime) / 16.666, 2.5);
      lastTime = time;

      const burstFactor = 1.0 + burstEnergyRef.current * 1.5;
      burstEnergyRef.current *= 0.94;

      // Base black background with trailing persistence
      ctx.fillStyle = 'rgba(0, 4, 2, 0.18)';
      ctx.fillRect(0, 0, width, height);

      const activeCode = roomCodeRef.current.trim().toUpperCase();
      const codeDigits = activeCode.replace(/[^0-9A-Z]/g, '');
      const mx = mousePosRef.current.x;
      const my = mousePosRef.current.y;

      for (let s = 0; s < streams.length; s++) {
        const stream = streams[s];

        stream.y += stream.speed * stream.direction * delta * burstFactor;

        const streamPixelHeight = stream.length * stream.fontSize;
        if (stream.direction === 1 && stream.y - streamPixelHeight > height) {
          stream.y = -Math.random() * 150;
          stream.speed = stream.depth === 2 ? Math.random() * 1.4 + 2.0 : stream.depth === 1 ? Math.random() * 0.9 + 1.1 : Math.random() * 0.5 + 0.5;
        } else if (stream.direction === -1 && stream.y + streamPixelHeight < 0) {
          stream.y = height + Math.random() * 150;
          stream.speed = stream.depth === 2 ? Math.random() * 1.4 + 2.0 : stream.depth === 1 ? Math.random() * 0.9 + 1.1 : Math.random() * 0.5 + 0.5;
        }

        if (Math.random() < stream.mutationSpeed) {
          const randIdx = Math.floor(Math.random() * stream.length);
          stream.digits[randIdx] = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
        }

        if (stream.hasRoomInjection && codeDigits.length > 0) {
          for (let c = 0; c < codeDigits.length; c++) {
            const targetPos = (stream.roomInjectionIndex + c) % stream.length;
            stream.digits[targetPos] = codeDigits[c];
          }
        }

        ctx.font = `700 ${stream.fontSize}px 'JetBrains Mono', 'Courier New', monospace`;

        for (let i = 0; i < stream.length; i++) {
          const charY = stream.direction === 1
            ? stream.y - i * stream.fontSize
            : stream.y + i * stream.fontSize;

          if (charY < -20 || charY > height + 20) continue;

          const digit = stream.digits[i] || '0';
          const trailRatio = 1 - i / stream.length;

          // Check proximity to cursor for subtle excitation
          const distToMouse = Math.hypot(stream.x - mx, charY - my);
          const isNearCursor = distToMouse < 80;

          if (i === 0) {
            ctx.fillStyle = PALETTE.HIGHLIGHT;
            ctx.globalAlpha = Math.min(1.0, stream.baseOpacity + (isNearCursor ? 0.25 : 0));
            if (stream.depth === 2 || isNearCursor) {
              ctx.shadowColor = PALETTE.NEON;
              ctx.shadowBlur = isNearCursor ? 12 : 8;
            }
            ctx.fillText(digit, stream.x, charY);
            ctx.shadowBlur = 0;
          } else if (i < 4 && stream.depth === 2) {
            ctx.fillStyle = PALETTE.NEON;
            ctx.globalAlpha = Math.min(1.0, stream.baseOpacity * trailRatio + (isNearCursor ? 0.2 : 0));
            ctx.fillText(digit, stream.x, charY);
          } else if (trailRatio > 0.5) {
            ctx.fillStyle = isNearCursor ? PALETTE.HIGHLIGHT : stream.depth === 0 ? PALETTE.DIM : PALETTE.BRIGHT;
            ctx.globalAlpha = Math.min(1.0, stream.baseOpacity * trailRatio + (isNearCursor ? 0.25 : 0));
            ctx.fillText(digit, stream.x, charY);
          } else {
            ctx.fillStyle = isNearCursor ? PALETTE.BRIGHT : PALETTE.DIM;
            ctx.globalAlpha = Math.min(1.0, stream.baseOpacity * trailRatio * 0.8 + (isNearCursor ? 0.2 : 0));
            ctx.fillText(digit, stream.x, charY);
          }
        }
      }

      ctx.globalAlpha = 1.0;
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const displayRoomCode = activeRoomCode.trim();

  return (
    <>
      {/* 1. Bidirectional Digital Number Stream Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 select-none bg-black"
      />

      {/* 2. Large Background Telemetry & Room Identifier HUD Layer (Non-blocking z-1) */}
      <div
        aria-hidden="true"
        style={{
          transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0)`,
          transition: 'transform 0.1s ease-out',
        }}
        className="fixed inset-0 pointer-events-none z-[1] select-none flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Central Concentric Cyber-Radar & HUD Target Rings */}
        <div className="absolute w-[440px] h-[440px] sm:w-[600px] sm:h-[600px] md:w-[760px] md:h-[760px] rounded-full border border-[#00FF41]/[0.08] flex items-center justify-center pointer-events-none animate-cyber-pulse">
          {/* Outer Ring Ticks */}
          <div className="absolute inset-0 rounded-full border border-dashed border-[#00FF41]/[0.05]" />
          {/* Inner Ring */}
          <div className="w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] md:w-[520px] md:h-[520px] rounded-full border border-[#00FF41]/[0.06] flex items-center justify-center">
            <div className="w-[160px] h-[160px] sm:w-[240px] sm:h-[240px] rounded-full border border-[#00FF41]/[0.05]" />
          </div>

          {/* Rotating Radar Sweep Line */}
          <div className="absolute inset-0 animate-radar-sweep pointer-events-none">
            <div className="w-1/2 h-full border-r border-[#00FF41]/[0.10] bg-gradient-to-r from-transparent to-[#00FF41]/[0.03] origin-right" />
          </div>

          {/* Coordinate Crosshairs */}
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#00FF41]/[0.12] to-transparent" />
          <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-[#00FF41]/[0.12] to-transparent" />

          {/* HUD Telemetry Labels */}
          <div className="absolute top-4 text-[9px] font-mono tracking-[0.3em] text-[#00FF41]/20 font-bold uppercase">
            // CHANNEL TELEMETRY //
          </div>
          <div className="absolute bottom-4 text-[9px] font-mono tracking-[0.3em] text-[#00FF41]/20 font-bold uppercase">
            // E2EE AES-256-GCM //
          </div>
          <div className="absolute left-4 -rotate-90 text-[9px] font-mono tracking-[0.3em] text-[#00FF41]/20 font-bold uppercase">
            SECURE NODE
          </div>
          <div className="absolute right-4 rotate-90 text-[9px] font-mono tracking-[0.3em] text-[#00FF41]/20 font-bold uppercase">
            ZERO PLAINTEXT
          </div>
        </div>

        {/* Radial Excitation Energy Wave on Packet Pulse */}
        {isPulseActive && (
          <div className="absolute w-[500px] h-[500px] sm:w-[800px] sm:h-[800px] rounded-full bg-radial from-[#00FF41]/25 via-[#00FF41]/08 to-transparent pointer-events-none animate-ping" />
        )}

        {/* Large Digital Room Number / Channel Identifier */}
        <div className={`relative flex flex-col items-center justify-center text-center max-w-4xl px-4 transition-all duration-300 ${
          isPulseActive ? 'scale-[1.04]' : 'animate-cyber-glitch'
        }`}>
          {displayRoomCode ? (
            <>
              {/* Channel Header Tag */}
              <div className={`flex items-center gap-2 mb-2 text-[11px] sm:text-xs font-mono font-bold tracking-[0.35em] uppercase transition-colors duration-300 ${
                isPulseActive ? 'text-[#39FF88]' : 'text-[#00FF41]/40'
              }`}>
                <span className={`inline-block w-2 h-2 rounded-full ${
                  isPulseActive ? 'bg-[#39FF88] animate-ping' : 'bg-[#00FF41]/60'
                }`} />
                <span>// ENCRYPTED CHANNEL //</span>
              </div>

              {/* Massive Digital Room Code */}
              <div className={`font-mono font-black text-7xl sm:text-9xl md:text-[140px] leading-none tracking-[0.2em] sm:tracking-[0.3em] select-none transition-all duration-300 ${
                isPulseActive
                  ? 'text-[#00FF41]/60 drop-shadow-[0_0_60px_rgba(0,255,65,0.8)]'
                  : 'text-[#00FF41]/[0.14] drop-shadow-[0_0_35px_rgba(0,255,65,0.25)]'
              }`}>
                {displayRoomCode.split('').join(' ')}
              </div>

              {/* Sub-channel System Badge */}
              <div className="mt-3 flex items-center gap-3 text-[10px] sm:text-xs font-mono tracking-[0.25em] text-[#39FF88]/30 font-bold uppercase">
                <span>NX-{displayRoomCode}</span>
                <span>•</span>
                <span>CHANNEL ACTIVE</span>
                <span>•</span>
                <span>DATA STREAM LOCKED</span>
              </div>
            </>
          ) : (
            <>
              {/* Default Landing Page System Identifier */}
              <div className="flex items-center gap-2 mb-2 text-[11px] sm:text-xs font-mono font-bold tracking-[0.35em] text-[#00FF41]/35 uppercase">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF41]/40" />
                <span>// SECURE SYSTEM NODE //</span>
              </div>

              {/* Large NX-CORE Telemetry */}
              <div className="font-mono font-black text-6xl sm:text-8xl md:text-[120px] leading-none tracking-[0.2em] text-[#00FF41]/[0.10] drop-shadow-[0_0_30px_rgba(0,255,65,0.18)] select-none">
                NX-CORE
              </div>

              {/* Sub-telemetry Info */}
              <div className="mt-3 flex items-center gap-2 text-[10px] sm:text-xs font-mono tracking-[0.25em] text-[#39FF88]/25 font-bold uppercase">
                <span>ENCLAVE MATRIX</span>
                <span>•</span>
                <span>256-BIT CRYPTO ARMED</span>
                <span>•</span>
                <span>STANDBY</span>
              </div>
            </>
          )}
        </div>

        {/* 3. Viewport Technical HUD Corners */}
        <div className="fixed top-3 left-4 text-[10px] font-mono text-[#00FF41]/30 hidden sm:block leading-tight">
          <span className="text-[#00FF41]/50 font-bold">┌───────────────────────────</span>
          <br />
          <span>│ NEXUS LIVE TELEMETRY</span>
          <br />
          <span>│ STATUS: SECURE_ONLINE</span>
        </div>

        <div className="fixed top-3 right-4 text-[10px] font-mono text-[#00FF41]/30 text-right hidden sm:block leading-tight">
          <span className="text-[#00FF41]/50 font-bold">───────────────────────────┐</span>
          <br />
          <span>CHANNEL: {displayRoomCode ? `NX-${displayRoomCode}` : 'NX-CORE'} │</span>
          <br />
          <span>E2EE: AES-256-GCM │</span>
        </div>

        <div className="fixed bottom-3 left-4 text-[10px] font-mono text-[#00FF41]/30 hidden sm:block leading-tight">
          <span>│ ZERO-PLAINTEXT WIRE</span>
          <br />
          <span>│ MEMORY ISOLATION: L-4</span>
          <br />
          <span className="text-[#00FF41]/50 font-bold">└───────────────────────────</span>
        </div>

        <div className="fixed bottom-3 right-4 text-[10px] font-mono text-[#00FF41]/30 text-right hidden sm:block leading-tight">
          <span>PACKET BUS: 60FPS │</span>
          <br />
          <span>DATA FLOW: BIDIRECTIONAL │</span>
          <br />
          <span className="text-[#00FF41]/50 font-bold">───────────────────────────┘</span>
        </div>
      </div>
    </>
  );
};
