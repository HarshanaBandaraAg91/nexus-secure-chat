import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { PacketTravelVisual } from './PacketTravelVisual';
import { TelemetryCounter } from './TelemetryCounter';
import {
  ShieldCheck,
  Users,
  Radio,
  Lock,
  Terminal,
  Sparkles,
  Cpu,
  Activity,
  Server,
  HardDrive,
} from 'lucide-react';
import { deriveAlphabetPosition } from '../crypto/visualCipher';

export const ChatLayout: React.FC = () => {
  const { messages, session, members, transportMode, packetStats, systemLogs, pulseTrigger } = useChat();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [watermarkPulse, setWatermarkPulse] = useState(false);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Watermark pulse trigger on message activity
  useEffect(() => {
    if (pulseTrigger > 0) {
      setWatermarkPulse(true);
      const timer = setTimeout(() => setWatermarkPulse(false), 800);
      return () => clearTimeout(timer);
    }
  }, [pulseTrigger]);

  const userDerivation = session ? deriveAlphabetPosition(session.userAccessCode) : null;
  const currentRoom = session?.roomCode || '444';

  return (
    <div className="relative z-10 flex flex-col flex-1 h-[calc(100vh-53px)] overflow-hidden font-mono">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Telemetry Sidebar (Classified Node Monitor & Live Packet Log) */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-cyber-border bg-[#000803]/92 backdrop-blur-md p-3.5 text-xs space-y-3 select-none overflow-y-auto">
          {/* Node Branding Panel */}
          <div className="sidebar-panel hud-corners border border-cyber-border bg-cyber-surface p-2.5 space-y-1.5">
            <div className="flex items-center justify-between border-b border-cyber-border/80 pb-1">
              <span className="text-[10px] text-cyber-muted font-bold tracking-widest uppercase flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-cyber-primary" /> NEXUS // SECURE NODE
              </span>
              <span className="h-2 w-2 rounded-full bg-cyber-primary animate-pulse-subtle" />
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-cyber-muted">SYSTEM:</span>
                <span className="text-cyber-primary font-bold">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyber-muted">CHANNEL:</span>
                <span className="text-cyber-bright font-bold">#{session?.roomCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyber-muted">SECURITY:</span>
                <span className="text-cyber-primary font-bold">L-4 ENCRYPTED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyber-muted">CRYPTO:</span>
                <span className="text-cyber-bright">AES-256-GCM</span>
              </div>
            </div>
          </div>

          {/* Session Metadata & Live Packet Telemetry */}
          <div className="sidebar-panel hud-corners border border-cyber-border bg-cyber-surface p-2.5 space-y-1 text-[11px]">
            <div className="text-[10px] text-cyber-muted font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <HardDrive className="h-3.5 w-3.5 text-cyber-primary" /> PACKET TELEMETRY
            </div>
            <div className="flex justify-between">
              <span className="text-cyber-muted">TOTAL PKTS:</span>
              <span className="text-cyber-bright font-bold">
                <TelemetryCounter value={packetStats.total} digits={3} />
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyber-muted">TX / RX:</span>
              <span className="text-cyber-primary font-bold">
                <TelemetryCounter value={packetStats.tx} digits={3} /> / <TelemetryCounter value={packetStats.rx} digits={3} />
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyber-muted">LINK:</span>
              <span className="text-cyber-primary font-bold flex items-center gap-1.5">
                <span className="flex items-end gap-0.5">
                  <span className="signal-bar signal-bar-1" />
                  <span className="signal-bar signal-bar-2" />
                  <span className="signal-bar signal-bar-3" />
                  <span className="signal-bar signal-bar-4" />
                </span>
                STABLE
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyber-muted">TRANSPORT:</span>
              <span className="text-cyber-textMuted truncate max-w-[100px]">
                {transportMode === 'SUPABASE_REALTIME' ? 'WSS/REALTIME' : 'LOCAL PEER'}
              </span>
            </div>
          </div>

          {/* Visual Cipher Shift Key Monitor */}
          {userDerivation && (
            <div className="sidebar-panel hud-corners border border-cyber-border bg-cyber-surface p-2.5 space-y-1 text-[11px]">
              <div className="text-[10px] text-cyber-muted font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-cyber-primary" /> VISUAL CIPHER KEY
              </div>
              <div className="flex justify-between">
                <span className="text-cyber-muted">ACCESS CODE:</span>
                <span className="text-cyber-bright font-bold">{userDerivation.rawCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyber-muted">DERIVED SHIFT:</span>
                <span className="text-cyber-primary font-bold">
                  POS {userDerivation.finalPosition} [{userDerivation.mappedLetter}]
                </span>
              </div>
            </div>
          )}

          {/* Live Packet Activity Log */}
          <div className="sidebar-panel hud-corners border border-cyber-border bg-cyber-surface p-2.5 space-y-1 text-[11px] flex-1 flex flex-col min-h-[140px]">
            <div className="text-[10px] text-cyber-muted font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-cyber-primary" /> PACKET LOG
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyber-primary animate-ping" />
            </div>
            <div className="space-y-1 overflow-y-auto flex-1 font-mono text-[10px] pr-1">
              {systemLogs.map((log, index) => (
                <div
                  key={log.id}
                  className={`leading-tight p-0.5 rounded transition-colors ${
                    index === systemLogs.length - 1 ? 'animate-log-flash' : ''
                  } ${
                    log.type === 'TX'
                      ? 'text-cyber-primary font-bold'
                      : log.type === 'RX'
                      ? 'text-cyber-bright font-bold'
                      : log.type === 'SECURITY'
                      ? 'text-[#39FF88]'
                      : 'text-cyber-muted'
                  }`}
                >
                  <span className="text-cyber-darker mr-1">[{log.timestamp}]</span>
                  <span>{log.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Connected Enclave Participants */}
          <div className="sidebar-panel hud-corners border border-cyber-border bg-cyber-surface p-2.5">
            <div className="text-[10px] text-cyber-muted font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-cyber-primary" /> NODES ({members.length})
              </span>
              <span className="text-cyber-primary font-mono text-[9px]">ENCLAVE</span>
            </div>
            <div className="space-y-1 max-h-[90px] overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between border border-cyber-borderMuted bg-cyber-bg p-1.5 text-[10px] transition-colors hover:border-[#00FF41]/50"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyber-primary animate-pulse-subtle" />
                    <span className="font-bold text-cyber-bright truncate">
                      {member.username}
                    </span>
                  </div>
                  <span className="text-[8px] text-cyber-muted font-bold">[{member.role}]</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Tactical Feed & Transmission Area */}
        <main className="relative flex-1 flex flex-col overflow-hidden bg-[#000402]/70 backdrop-blur-[2px] terminal-grid">
          {/* Subtle Cursor Spotlight Glow */}
          <div className="chat-workspace-spotlight absolute inset-0 z-0 pointer-events-none" />

          {/* Subtle Horizontal Scanline Sweep */}
          <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF41]/35 to-transparent animate-chat-scan pointer-events-none z-20" />

          {/* Large Background Room Watermark with Cinematic Pulse */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
            <div
              className={`font-mono font-black text-8xl sm:text-[150px] md:text-[200px] tracking-[0.25em] sm:tracking-[0.35em] uppercase text-center transition-all duration-500 ${
                watermarkPulse
                  ? 'text-[#00FF41]/[0.12] scale-105 drop-shadow-[0_0_40px_rgba(0,255,65,0.4)]'
                  : 'text-[#00FF41]/[0.05] scale-100'
              }`}
            >
              // {currentRoom} //
            </div>
          </div>

          {/* Live Packet Travel Particle & Beam Layer */}
          <PacketTravelVisual />

          {/* Feed Header Live Telemetry Bar */}
          <div className="border-b border-cyber-border bg-[#050B07]/95 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-cyber-muted z-20">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1 text-cyber-primary font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-cyber-primary animate-pulse" />
                CHANNEL: SECURE
              </span>
              <span className="text-cyber-darker">|</span>
              <span>ROOM: <strong className="text-cyber-bright font-bold">{currentRoom}</strong></span>
              <span className="text-cyber-darker">|</span>
              <span>
                PACKETS: <strong className="text-cyber-bright font-bold"><TelemetryCounter value={packetStats.total} digits={3} /></strong>
              </span>
              <span className="text-cyber-darker">|</span>
              <span>
                TX: <strong className="text-cyber-primary font-bold"><TelemetryCounter value={packetStats.tx} digits={3} /></strong>
              </span>
              <span className="text-cyber-darker">|</span>
              <span>
                RX: <strong className="text-cyber-bright font-bold"><TelemetryCounter value={packetStats.rx} digits={3} /></strong>
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-cyber-textMuted">
              <span className="flex items-center gap-1">
                <Radio className="h-3 w-3 text-cyber-primary animate-pulse-subtle" />
                LINK: <strong className="text-cyber-primary font-bold">STABLE</strong>
              </span>
              <span className="text-cyber-darker">|</span>
              <span>LATENCY: <strong className="text-cyber-muted">---</strong></span>
              <span className="text-cyber-darker">|</span>
              <span className="hidden md:inline">E2EE: <strong className="text-cyber-primary">AES-256-GCM</strong></span>
            </div>
          </div>

          {/* Viewport Top/Bottom Cyber Corner HUD Markers */}
          <div className="px-4 pt-1.5 flex justify-between text-[9px] font-mono text-[#00FF41]/25 select-none pointer-events-none z-10">
            <span>┌ NX://CHANNEL/{currentRoom}</span>
            <span>E2EE: AES-256-GCM ┐</span>
          </div>

          {/* Encrypted Packets Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 relative z-10">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 select-none relative z-10 animate-fade-in">
                <div className="hud-corners border border-cyber-border bg-[#000d05]/95 p-6 max-w-md shadow-hud-panel space-y-3">
                  <div className="flex items-center justify-center gap-2 text-cyber-primary text-xs font-bold tracking-widest">
                    <Terminal className="h-4 w-4" />
                    <span>NEXUS SECURE CHANNEL</span>
                  </div>
                  <div className="inline-block border border-cyber-border bg-cyber-surface px-3 py-1 text-[11px] text-cyber-bright font-bold">
                    [ E2EE LINK ESTABLISHED: AES-256-GCM ]
                  </div>
                  <p className="text-xs text-cyber-muted leading-relaxed">
                    WAITING FOR ENCRYPTED TRAFFIC...
                    <span className="cursor-blink ml-1.5" />
                  </p>
                  <div className="text-[10px] text-cyber-textMuted border-t border-cyber-border/60 pt-2 flex justify-between">
                    <span>ZERO-PLAINTEXT ENCLAVE</span>
                    <span className="text-cyber-primary font-bold">● STANDBY</span>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Viewport Bottom HUD Markers */}
          <div className="px-4 pb-1 flex justify-between text-[9px] font-mono text-[#00FF41]/25 select-none pointer-events-none z-10">
            <span>└ ZERO-PLAINTEXT WIRE</span>
            <span>PORT: SECURE_WSS ┘</span>
          </div>

          {/* Terminal Command Input */}
          <MessageInput />
        </main>
      </div>
    </div>
  );
};
