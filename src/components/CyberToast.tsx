import React, { createContext, useContext, useState, useCallback } from 'react';
import { Terminal, Shield, CheckCircle2 } from 'lucide-react';

interface ToastItem {
  id: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'SECURITY';
}

interface ToastContextValue {
  showToast: (message: string, type?: 'INFO' | 'SUCCESS' | 'SECURITY') => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useCyberToast = () => useContext(ToastContext);

export const CyberToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: 'INFO' | 'SUCCESS' | 'SECURITY' = 'INFO') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast HUD Overlay */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none select-none max-w-sm"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-toast-in hud-corners border border-[#00FF41]/50 bg-[#000d05]/95 px-3.5 py-2 text-xs font-mono shadow-[0_0_15px_rgba(0,255,65,0.25)] backdrop-blur-md flex items-center gap-2.5"
          >
            {toast.type === 'SECURITY' ? (
              <Shield className="h-3.5 w-3.5 text-[#39FF88] shrink-0" />
            ) : toast.type === 'SUCCESS' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-cyber-primary shrink-0" />
            ) : (
              <Terminal className="h-3.5 w-3.5 text-cyber-primary shrink-0" />
            )}
            <span className="text-[#D7FFE6] font-bold tracking-wide">
              {toast.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
