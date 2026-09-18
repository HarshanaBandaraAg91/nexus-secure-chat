import React, { useState, useEffect, useRef } from 'react';
import { ChatProvider, useChat } from './context/ChatContext';
import { CyberMatrixBackground } from './components/CyberMatrixBackground';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { ChatLayout } from './components/ChatLayout';
import { PageTransition } from './components/PageTransition';
import { CyberToastProvider } from './components/CyberToast';

const AppContent: React.FC = () => {
  const { session } = useChat();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevSessionRef = useRef(session);

  useEffect(() => {
    // If session transitioned from null to an active session, trigger transition sequence
    if (!prevSessionRef.current && session) {
      setIsTransitioning(true);
    }
    prevSessionRef.current = session;
  }, [session]);

  return (
    <div className="relative min-h-screen flex flex-col bg-black text-[#D7FFE6] font-mono overflow-x-hidden terminal-grid selection:bg-[#00FF41] selection:text-black">
      {/* Global Enclave Page Transition */}
      <PageTransition
        isTransitioning={isTransitioning}
        targetRoomCode={session?.roomCode || '444'}
        onComplete={() => setIsTransitioning(false)}
      />

      {/* Non-Blocking Atmospheric SOC Layers */}
      <CyberMatrixBackground />
      <div className="terminal-crt-overlay" aria-hidden="true" />

      {/* Main Interactive Application Plane */}
      <Header />
      <main className="relative z-10 flex-1 flex flex-col">
        {session ? <ChatLayout /> : <LoginPage />}
      </main>
    </div>
  );
};

export function App() {
  return (
    <ChatProvider>
      <CyberToastProvider>
        <AppContent />
      </CyberToastProvider>
    </ChatProvider>
  );
}

export default App;
