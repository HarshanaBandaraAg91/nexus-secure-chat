import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { ChatProvider } from '../context/ChatContext';
import { LoginPage } from './LoginPage';
import { Header } from './Header';
import { WireInspectorModal } from './WireInspectorModal';
import { SecurityStatusModal } from './SecurityStatusModal';
import { DecryptDialog } from './DecryptDialog';
import { RoomCreatedModal } from './RoomCreatedModal';
import { MessageInput } from './MessageInput';
import { MagneticButton } from './MagneticButton';
import { TelemetryCounter } from './TelemetryCounter';
import { PageTransition } from './PageTransition';
import { CyberToastProvider, useCyberToast } from './CyberToast';
import { ProcessedChatMessage } from '../services/messageService';

describe('UI Interactive Components & Action Button Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('LoginPage: switching between CREATE and JOIN tabs updates form action buttons', () => {
    render(
      <ChatProvider>
        <LoginPage />
      </ChatProvider>
    );

    // Initial tab is INITIALIZE ENCLAVE
    const createTabBtn = screen.getByText(/> INITIALIZE ENCLAVE/);
    const joinTabBtn = screen.getByText(/> CONNECT ENCLAVE/);

    expect(createTabBtn).toBeDefined();
    expect(joinTabBtn).toBeDefined();

    // Switch to JOIN ENCLAVE
    fireEvent.click(joinTabBtn);
    expect(screen.getByText(/NEXUS \/\/ JOIN ENCLAVE/)).toBeDefined();

    // Switch back to CREATE ENCLAVE
    fireEvent.click(createTabBtn);
    expect(screen.getByText(/NEXUS \/\/ CREATE ENCLAVE/)).toBeDefined();
  });

  it('WireInspectorModal: opens, displays zero-plaintext metadata, and triggers close action', () => {
    const handleClose = vi.fn();
    const mockMessage: ProcessedChatMessage = {
      id: 'msg-1',
      roomId: 'room-1',
      senderId: 'user-1',
      senderUsername: 'Bob',
      ciphertext: 'k8X9F2A9...',
      iv: 'pL0Q12...',
      visualShift: 16,
      createdAt: new Date().toISOString(),
      isSelf: false,
      aesDecryptedText: 'pbbp',
      visualDecryptedText: null,
      isVisualDecrypted: false,
    };

    render(<WireInspectorModal message={mockMessage} onClose={handleClose} />);

    expect(screen.getByText(/WIRE INSPECTOR \/\/ PACKET ANALYSIS/)).toBeDefined();
    expect(screen.getByText('AES-256-GCM')).toBeDefined();
    expect(screen.getByText('k8X9F2A9...')).toBeDefined();

    const closeBtn = screen.getByText(/\[ CLOSE INSPECTOR \]/);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('SecurityStatusModal: displays 4-layer security matrix and closes on action', () => {
    const handleClose = vi.fn();
    render(
      <ChatProvider>
        <SecurityStatusModal onClose={handleClose} />
      </ChatProvider>
    );

    expect(screen.getByText(/NEXUS SECURITY AUDIT/)).toBeDefined();
    expect(screen.getByText(/01 \/\/ ROOM IDENTIFIER/)).toBeDefined();
    expect(screen.getByText(/03 \/\/ CRYPTOGRAPHIC LAYER/)).toBeDefined();
    expect(screen.getByText(/ZERO PLAINTEXT/)).toBeDefined();

    const closeBtn = screen.getByText(/\[ DISMISS AUDIT CONSOLE \]/);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('RoomCreatedModal: displays room credentials, copy actions, and Enter Enclave button', () => {
    const handleEnter = vi.fn();
    render(
      <RoomCreatedModal
        roomCode="434"
        creatorAccessCode="5555"
        guestAccessCode="2266"
        onEnterEnclave={handleEnter}
      />
    );

    expect(screen.getByText(/\[ NEXUS ENCLAVE INITIALIZED \]/)).toBeDefined();
    expect(screen.getByText('434')).toBeDefined();
    expect(screen.getByText('5555')).toBeDefined();
    expect(screen.getByText('2266')).toBeDefined();

    const enterBtn = screen.getByText(/\[ ENTER ENCLAVE \]/);
    fireEvent.click(enterBtn);
    expect(handleEnter).toHaveBeenCalledTimes(1);
  });

  it('DecryptDialog: renders input field and triggers visual cipher decode submit', () => {
    const handleClose = vi.fn();
    render(
      <ChatProvider>
        <DecryptDialog
          messageId="msg-1"
          cipherText="pbbp"
          senderUsername="Bob"
          visualShift={16}
          onClose={handleClose}
        />
      </ChatProvider>
    );

    expect(screen.getByText(/CRYPTOGRAPHIC DECRYPTION/)).toBeDefined();
    expect(screen.getByText('pbbp')).toBeDefined();

    const input = screen.getByPlaceholderText(/e\.g\. 16 or 2266/);
    fireEvent.change(input, { target: { value: '16' } });

    const decryptBtn = screen.getByText(/\[ > EXECUTE DECRYPTION \]/);
    expect(decryptBtn).toBeDefined();
  });

  it('CyberTelemetryBackground: dynamically displays default NX-CORE and updates with rooms 434, 782, 159', async () => {
    const { CyberMatrixBackground } = await import('./CyberMatrixBackground');
    
    const { unmount } = render(
      <ChatProvider>
        <CyberMatrixBackground />
        <LoginPage />
      </ChatProvider>
    );

    expect(screen.getByText('NX-CORE')).toBeDefined();
    expect(screen.getByText(/\/\/ SECURE SYSTEM NODE \/\//)).toBeDefined();

    const roomInput = screen.getByPlaceholderText(/Enter room code \(e\.g\. 434\)/);

    // Test with Room 434
    fireEvent.change(roomInput, { target: { value: '434' } });
    expect(screen.getByText('4 3 4')).toBeDefined();
    expect(screen.getAllByText(/NX-434/).length).toBeGreaterThanOrEqual(1);

    // Test with Room 782
    fireEvent.change(roomInput, { target: { value: '782' } });
    expect(screen.getByText('7 8 2')).toBeDefined();
    expect(screen.getAllByText(/NX-782/).length).toBeGreaterThanOrEqual(1);

    // Test with Room 159
    fireEvent.change(roomInput, { target: { value: '159' } });
    expect(screen.getByText('1 5 9')).toBeDefined();
    expect(screen.getAllByText(/NX-159/).length).toBeGreaterThanOrEqual(1);

    unmount();
  });

  it('LivePacketTransmission: renders PacketTravelVisual and updates live packet telemetry status in ChatLayout', async () => {
    const { ChatLayout } = await import('./ChatLayout');
    const { PacketTravelVisual } = await import('./PacketTravelVisual');

    render(
      <ChatProvider>
        <PacketTravelVisual />
        <ChatLayout />
      </ChatProvider>
    );

    expect(screen.getByText(/CHANNEL: SECURE/)).toBeDefined();
    expect(screen.getByText(/PACKETS:/)).toBeDefined();
    expect(screen.getByText(/PACKET LOG/)).toBeDefined();
    expect(screen.getAllByText(/AES-256-GCM/).length).toBeGreaterThanOrEqual(1);
  });

  it('MagneticButton: handles mouse interaction, click event, and styles', () => {
    const handleClick = vi.fn();
    render(
      <MagneticButton variant="bright" onClick={handleClick}>
        TRANSMIT PAYLOAD
      </MagneticButton>
    );

    const btn = screen.getByRole('button', { name: /TRANSMIT PAYLOAD/ });
    expect(btn).toBeDefined();

    fireEvent.mouseEnter(btn);
    fireEvent.mouseMove(btn, { clientX: 100, clientY: 100 });
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
    fireEvent.mouseLeave(btn);
  });

  it('TelemetryCounter: formats digits with leading zeros and updates on value changes', () => {
    const { rerender } = render(<TelemetryCounter value={5} digits={3} />);
    expect(screen.getByText('005')).toBeDefined();

    rerender(<TelemetryCounter value={42} digits={3} />);
    expect(screen.getByText('042')).toBeDefined();
  });

  it('PageTransition: renders boot sequence and calls onComplete callback', async () => {
    vi.useFakeTimers();
    const handleComplete = vi.fn();

    render(
      <PageTransition
        isTransitioning={true}
        targetRoomCode="444"
        onComplete={handleComplete}
      />
    );

    expect(screen.getByText(/NEXUS \/\/ ENCLAVE INITIALIZER/)).toBeDefined();
    expect(screen.getByText(/INITIALIZING SECURE CHANNEL/)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(handleComplete).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('CyberToastProvider: shows system toast notifications and auto-dismisses', async () => {
    vi.useFakeTimers();

    const TestToastConsumer = () => {
      const { showToast } = useCyberToast();
      return (
        <button onClick={() => showToast('> TEST TOAST NOTIFICATION', 'SUCCESS')}>
          Trigger Toast
        </button>
      );
    };

    render(
      <CyberToastProvider>
        <TestToastConsumer />
      </CyberToastProvider>
    );

    const triggerBtn = screen.getByText('Trigger Toast');
    act(() => {
      fireEvent.click(triggerBtn);
    });

    expect(screen.getByText('> TEST TOAST NOTIFICATION')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.queryByText('> TEST TOAST NOTIFICATION')).toBeNull();
    vi.useRealTimers();
  });
});
