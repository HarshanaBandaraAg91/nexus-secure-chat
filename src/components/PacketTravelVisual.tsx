import React, { useEffect, useState } from 'react';
import { useChat } from '../context/ChatContext';

interface ActivePacket {
  id: string;
  type: 'TX' | 'RX';
  packetHex: string;
  pos: number;
}

export const PacketTravelVisual: React.FC = () => {
  const { transmitStage, packetStats, pulseTrigger } = useChat();
  const [activePackets, setActivePackets] = useState<ActivePacket[]>([]);

  // TX Packet Generation
  useEffect(() => {
    if (transmitStage === 'IN_TRANSIT') {
      const pktId = packetStats.lastPacketId || ('0x' + Math.random().toString(16).slice(2, 6).toUpperCase());
      const newPkt: ActivePacket = {
        id: 'tx-' + Date.now(),
        type: 'TX',
        packetHex: pktId,
        pos: 50 + (Math.random() * 20 - 10),
      };

      setActivePackets((prev) => [...prev, newPkt]);

      const timer = setTimeout(() => {
        setActivePackets((prev) => prev.filter((p) => p.id !== newPkt.id));
      }, 850);

      return () => clearTimeout(timer);
    }
  }, [transmitStage, packetStats.lastPacketId]);

  // RX Packet Generation on incoming pulse
  useEffect(() => {
    if (pulseTrigger > 0 && transmitStage === 'IDLE') {
      const pktId = packetStats.lastPacketId || ('0x' + Math.random().toString(16).slice(2, 6).toUpperCase());
      const newPkt: ActivePacket = {
        id: 'rx-' + Date.now(),
        type: 'RX',
        packetHex: pktId,
        pos: 30 + Math.random() * 30,
      };

      setActivePackets((prev) => [...prev, newPkt]);

      const timer = setTimeout(() => {
        setActivePackets((prev) => prev.filter((p) => p.id !== newPkt.id));
      }, 850);

      return () => clearTimeout(timer);
    }
  }, [pulseTrigger]);

  if (activePackets.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none"
    >
      {activePackets.map((pkt) => (
        <div
          key={pkt.id}
          className={`absolute ${
            pkt.type === 'TX'
              ? 'bottom-16 animate-packet-beam'
              : 'top-1/3 left-8 animate-rx-packet-beam'
          } flex flex-col items-center`}
          style={pkt.type === 'TX' ? { left: `${pkt.pos}%` } : { top: `${pkt.pos}%` }}
        >
          {/* Leading Glowing Packet Head */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#00FF41] text-black text-[10px] font-mono font-black border border-[#39FF88] shadow-[0_0_18px_#00FF41] tracking-wider whitespace-nowrap">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-black animate-ping" />
            <span>{pkt.type === 'TX' ? '>>> TX' : '<<< RX'} PKT: {pkt.packetHex}</span>
          </div>

          {/* Glowing Cyber Energy Beam */}
          <div className={`w-[2px] ${pkt.type === 'TX' ? 'h-32' : 'h-20'} bg-gradient-to-t from-transparent via-[#00FF41] to-[#39FF88] shadow-[0_0_12px_#00FF41]`} />

          {/* Trailing Hex/Binary Fragments */}
          <div className="flex flex-col items-center text-[9px] font-mono font-bold text-[#39FF88] opacity-80 space-y-0.5 mt-0.5">
            <span>0x7F</span>
            <span>1011</span>
            <span>0xA4</span>
          </div>
        </div>
      ))}
    </div>
  );
};
