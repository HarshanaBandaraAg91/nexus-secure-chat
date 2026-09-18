/**
 * NEXUS GLOBAL CHAT & SECURITY CONTEXT
 * 
 * Manages state with strict separation:
 * - Room Code & Access Code for authorization
 * - Master 256-bit AES-GCM Key for true message encryption/decryption
 * - Visual Cipher Key for client-side visual Caesar decoding
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getOrCreateUserId, getSavedUsername, saveUsername } from '../services/authService';
import { ActiveSession, createRoom, joinRoom, RoomMember, JoinDiagnostics, getLatestJoinDiagnostics } from '../services/roomService';
import {
  ProcessedChatMessage,
  sendEncryptedMessage,
  fetchRoomMessages,
  subscribeToRoom,
} from '../services/messageService';
import { deriveAlphabetPosition, decodeVisualCipher } from '../crypto/visualCipher';
import { soundEffects } from '../lib/soundEffects';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export type TransmitStage = 'IDLE' | 'PACKET_BUILDING' | 'AES_ENCRYPTING' | 'IN_TRANSIT' | 'DELIVERED';

export interface PacketStats {
  total: number;
  tx: number;
  rx: number;
  lastPacketId: string | null;
  lastActionTime: string;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'INFO' | 'TX' | 'RX' | 'SECURITY' | 'SUCCESS';
}

interface ChatContextType {
  userId: string;
  username: string;
  setUsername: (name: string) => void;
  session: ActiveSession | null;
  messages: ProcessedChatMessage[];
  members: RoomMember[];
  isConnected: boolean;
  isConnecting: boolean;
  transportMode: 'SUPABASE_REALTIME' | 'LOCAL_PEER_BUS';
  error: string | null;
  joinDiagnostics: JoinDiagnostics | null;
  clearError: () => void;
  
  // Actions
  handleCreateRoom: (roomCode: string, creatorAccessCode: string, guestAccessCode?: string) => Promise<ActiveSession>;
  enterSession: (active: ActiveSession) => void;
  handleJoinRoom: (roomCode: string, accessCode: string) => Promise<void>;
  handleSendMessage: (text: string) => Promise<void>;
  handleDecryptMessage: (messageId: string, visualCipherKey: string) => { success: boolean; error?: string };
  handleLeaveRoom: () => void;
  
  // Audio & UI
  isMuted: boolean;
  toggleMute: () => void;
  autoDecryptWithSessionSS: boolean;
  toggleAutoDecrypt: () => void;
  
  // Dynamic Background Telemetry & Packet Pulse
  previewRoomCode: string;
  setPreviewRoomCode: (code: string) => void;
  activeRoomCode: string;
  transmitStage: TransmitStage;
  packetStats: PacketStats;
  systemLogs: SystemLogEntry[];
  pulseTrigger: number;
  triggerPulse: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId] = useState<string>(() => getOrCreateUserId());
  const [username, setUsernameState] = useState<string>(() => getSavedUsername() || '');
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [previewRoomCode, setPreviewRoomCode] = useState<string>('');
  const [messages, setMessages] = useState<ProcessedChatMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [joinDiagnostics, setJoinDiagnostics] = useState<JoinDiagnostics | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEffects.getMuted());
  const [autoDecryptWithSessionSS, setAutoDecryptWithSessionSS] = useState<boolean>(false);

  // Live Packet Transmission State & Telemetry Counters
  const [transmitStage, setTransmitStage] = useState<TransmitStage>('IDLE');
  const [pulseTrigger, setPulseTrigger] = useState<number>(0);
  const [packetStats, setPacketStats] = useState<PacketStats>({
    total: 0,
    tx: 0,
    rx: 0,
    lastPacketId: null,
    lastActionTime: new Date().toLocaleTimeString(),
  });
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([
    {
      id: 'log-0',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: '> NEXUS SYSTEM CORE ONLINE // SOC-READY',
      type: 'INFO',
    },
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: '> ZERO-PLAINTEXT PROTOCOL ENFORCED',
      type: 'SECURITY',
    },
  ]);

  const addSystemLog = useCallback((text: string, type: SystemLogEntry['type'] = 'INFO') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSystemLogs((prev) => [
      ...prev.slice(-16),
      {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
        timestamp,
        text,
        type,
      },
    ]);
  }, []);

  const triggerPulse = useCallback(() => {
    setPulseTrigger((prev) => prev + 1);
  }, []);

  const activeRoomCode = session?.roomCode || previewRoomCode || '';

  const transportMode: 'SUPABASE_REALTIME' | 'LOCAL_PEER_BUS' = isSupabaseConfigured
    ? 'SUPABASE_REALTIME'
    : 'LOCAL_PEER_BUS';

  const setUsername = useCallback((name: string) => {
    setUsernameState(name);
    saveUsername(name);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const toggleMute = useCallback(() => {
    const muted = soundEffects.toggleMute();
    setIsMuted(muted);
  }, []);

  const toggleAutoDecrypt = useCallback(() => {
    setAutoDecryptWithSessionSS((prev) => !prev);
  }, []);

  // Transition into active session (after creator reviews modal or on direct connect)
  const enterSession = useCallback(
    (active: ActiveSession) => {
      setSession(active);
      setIsConnected(true);
      triggerPulse();
      addSystemLog(`> ENCLAVE INITIALIZED // CHANNEL #${active.roomCode}`, 'SUCCESS');
      addSystemLog(`> E2EE LINK ESTABLISHED (AES-256-GCM)`, 'SECURITY');
      addSystemLog(`> NODE ${username.toUpperCase()} ONLINE [${active.role}]`, 'INFO');

      setMembers([
        {
          id: 'mem_' + userId,
          room_id: active.roomId,
          user_id: userId,
          username: username,
          role: active.role,
          joined_at: new Date().toISOString(),
        },
      ]);
      soundEffects.playConnectSuccess();
    },
    [userId, username, triggerPulse, addSystemLog]
  );

  // Handle Room Creation (returns ActiveSession so Creator can review RoomCreatedModal first)
  const handleCreateRoom = async (
    roomCode: string,
    creatorAccess: string,
    guestAccess: string = '2266'
  ): Promise<ActiveSession> => {
    if (!username.trim()) {
      const err = 'Please set a valid username before creating an enclave.';
      setError(err);
      soundEffects.playAccessDenied();
      throw new Error(err);
    }
    setIsConnecting(true);
    setError(null);

    try {
      const active = await createRoom(userId, username, roomCode, creatorAccess, guestAccess);
      return active;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create room enclave';
      setError(msg);
      soundEffects.playAccessDenied();
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle Room Join
  const handleJoinRoom = async (roomCode: string, accessCode: string) => {
    if (!username.trim()) {
      setError('Please set a valid username before joining an enclave.');
      soundEffects.playAccessDenied();
      return;
    }
    setIsConnecting(true);
    setError(null);

    try {
      const active = await joinRoom(userId, username, roomCode, accessCode);
      setJoinDiagnostics(getLatestJoinDiagnostics());
      setSession(active);
      setIsConnected(true);
      triggerPulse();
      addSystemLog(`> ENCLAVE CONNECTED // CHANNEL #${active.roomCode}`, 'SUCCESS');
      addSystemLog(`> E2EE LINK ESTABLISHED (AES-256-GCM)`, 'SECURITY');
      addSystemLog(`> NODE ${username.toUpperCase()} ONLINE [${active.role}]`, 'INFO');

      setMembers([
        {
          id: 'mem_' + userId,
          room_id: active.roomId,
          user_id: userId,
          username: username,
          role: active.role,
          joined_at: new Date().toISOString(),
        },
      ]);
      soundEffects.playConnectSuccess();
    } catch (err: unknown) {
      setJoinDiagnostics(getLatestJoinDiagnostics());
      const msg = err instanceof Error ? err.message : 'Failed to join room enclave';
      setError(msg);
      soundEffects.playAccessDenied();
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  // Subscribe to Realtime messages when active session exists
  useEffect(() => {
    if (!session) {
      setMessages([]);
      setIsConnected(false);
      return;
    }

    // Load initial messages
    fetchRoomMessages(session.roomId, session.roomCode, userId, session.masterKey).then((initialMsgs) => {
      setMessages(initialMsgs);
      setPacketStats((prev) => ({
        ...prev,
        total: initialMsgs.length,
        tx: initialMsgs.filter((m) => m.isSelf).length,
        rx: initialMsgs.filter((m) => !m.isSelf).length,
      }));
    });

    const unsubscribe = subscribeToRoom(
      session.roomId,
      session.roomCode,
      userId,
      session.masterKey,
      (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          
          // If receiver has auto-decrypt enabled, attempt visual decode with user's visual shift
          if (!newMsg.isSelf && autoDecryptWithSessionSS && newMsg.aesDecryptedText) {
            const { finalPosition } = deriveAlphabetPosition(session.userAccessCode);
            const decoded = decodeVisualCipher(newMsg.aesDecryptedText, finalPosition);
            newMsg.visualDecryptedText = decoded;
            newMsg.isVisualDecrypted = true;
          }

          return [...prev, newMsg];
        });

        if (!newMsg.isSelf) {
          triggerPulse();
          soundEffects.playMessageReceived();
          const pktId = '0x' + newMsg.id.replace(/-/g, '').slice(0, 4).toUpperCase();
          addSystemLog(`> PACKET RX ${pktId} // GMAC-128 VERIFIED`, 'RX');
          setPacketStats((prev) => ({
            ...prev,
            total: prev.total + 1,
            rx: prev.rx + 1,
            lastPacketId: pktId,
            lastActionTime: new Date().toLocaleTimeString(),
          }));
        }
      },
      (peerEvent: unknown) => {
        const ev = peerEvent as { type: string; user?: { id: string; username: string; role: 'CREATOR' | 'GUEST' | 'MEMBER' } };
        if (ev?.type === 'USER_JOINED' && ev.user) {
          addSystemLog(`> NODE ${ev.user.username.toUpperCase()} JOINED ENCLAVE`, 'INFO');
          setMembers((prev) => {
            if (prev.some((m) => m.user_id === ev.user!.id)) return prev;
            return [
              ...prev,
              {
                id: 'mem_' + ev.user!.id,
                room_id: session.roomId,
                user_id: ev.user!.id,
                username: ev.user!.username,
                role: ev.user!.role,
                joined_at: new Date().toISOString(),
              },
            ];
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [session, userId, autoDecryptWithSessionSS, addSystemLog, triggerPulse]);

  // Send Encrypted Message with live multi-stage telemetry
  const handleSendMessage = async (plaintext: string) => {
    if (!session || !plaintext.trim()) return;

    try {
      setTransmitStage('PACKET_BUILDING');
      triggerPulse();

      // Progressive telemetry stages
      setTimeout(() => {
        setTransmitStage((curr) => (curr === 'PACKET_BUILDING' ? 'AES_ENCRYPTING' : curr));
      }, 100);

      // Calculate visual shift derived from sender's access code or visual key
      const { finalPosition } = deriveAlphabetPosition(session.userAccessCode);

      soundEffects.playKeyClick();

      setTimeout(() => {
        setTransmitStage((curr) => (curr === 'AES_ENCRYPTING' ? 'IN_TRANSIT' : curr));
        triggerPulse();
      }, 220);

      const sentMsg = await sendEncryptedMessage(
        session.roomId,
        session.roomCode,
        userId,
        username,
        plaintext,
        session.masterKey,
        finalPosition
      );

      setMessages((prev) => [...prev, sentMsg]);
      soundEffects.playMessageSent();

      setTransmitStage('DELIVERED');
      const pktId = '0x' + sentMsg.id.replace(/-/g, '').slice(0, 4).toUpperCase();
      addSystemLog(`> PACKET TX ${pktId} // AES-256-GCM SENT`, 'TX');
      setPacketStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        tx: prev.tx + 1,
        lastPacketId: pktId,
        lastActionTime: new Date().toLocaleTimeString(),
      }));

      setTimeout(() => {
        setTransmitStage('IDLE');
      }, 950);
    } catch (err: unknown) {
      console.error('Failed to send encrypted message:', err);
      setTransmitStage('IDLE');
      soundEffects.playAccessDenied();
      addSystemLog(`> TX FAILED: SECURITY EXCEPTION`, 'SECURITY');
    }
  };

  // Reverses Visual Cipher layer for a specific message using the visual cipher key
  const handleDecryptMessage = (
    messageId: string,
    visualCipherInput: string
  ): { success: boolean; error?: string } => {
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg || !targetMsg.aesDecryptedText) {
      soundEffects.playAccessDenied();
      return { success: false, error: 'Target payload unavailable for visual decryption.' };
    }

    // Derive alphabet position from entered visual key (supports 4-digit codes like 2266 or direct numbers like 16)
    const numericDirect = parseInt(visualCipherInput.trim(), 10);
    const finalPosition = !isNaN(numericDirect) && numericDirect >= 1 && numericDirect <= 26 && visualCipherInput.trim().length <= 2
      ? numericDirect
      : deriveAlphabetPosition(visualCipherInput).finalPosition;

    // Check if visual cipher key matches message's visual shift
    if (targetMsg.visualShift && targetMsg.visualShift !== finalPosition) {
      soundEffects.playAccessDenied();
      return {
        success: false,
        error: 'ACCESS DENIED // INVALID VISUAL CIPHER KEY. Shift derivation mismatch.',
      };
    }

    // Decode visual cipher
    const decodedPlaintext = decodeVisualCipher(targetMsg.aesDecryptedText, finalPosition);

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              visualDecryptedText: decodedPlaintext,
              isVisualDecrypted: true,
            }
          : msg
      )
    );

    triggerPulse();
    const pktId = '0x' + messageId.replace(/-/g, '').slice(0, 4).toUpperCase();
    addSystemLog(`> DECRYPT PKT ${pktId} // VISUAL SHIFT ${finalPosition} APPLIED`, 'SUCCESS');
    soundEffects.playDecryptedSuccess();
    return { success: true };
  };

  // Leave room
  const handleLeaveRoom = () => {
    setSession(null);
    setMessages([]);
    setMembers([]);
    setIsConnected(false);
    setPreviewRoomCode('');
    setTransmitStage('IDLE');
  };

  return (
    <ChatContext.Provider
      value={{
        userId,
        username,
        setUsername,
        session,
        messages,
        members,
        isConnected,
        isConnecting,
        transportMode,
        error,
        joinDiagnostics,
        clearError,
        handleCreateRoom,
        enterSession,
        handleJoinRoom,
        handleSendMessage,
        handleDecryptMessage,
        handleLeaveRoom,
        isMuted,
        toggleMute,
        autoDecryptWithSessionSS,
        toggleAutoDecrypt,
        previewRoomCode,
        setPreviewRoomCode,
        activeRoomCode,
        transmitStage,
        packetStats,
        systemLogs,
        pulseTrigger,
        triggerPulse,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
