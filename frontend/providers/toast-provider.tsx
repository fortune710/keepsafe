import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ToastMessage from '@/components/toast-message';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
  duration?: number;
  title?: string;
}

interface ToastContextType {
  showToast: (message: string, type: 'success' | 'error', duration?: number, title?: string) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error', duration = 3000, title?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, message, type, duration, title };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-hide toast after duration
    setTimeout(() => {
      hideToast(id);
    }, duration);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toasts.map((toast) => (
        <ToastMessage
          key={toast.id}
          message={toast.message}
          type={toast.type}
          title={toast.title}
          visible={true}
        />
      ))}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}
