'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

// =============================================================================
// TOAST PROVIDER — Context-based toast notification system
// Exports: <ToastProvider> wrapper component and useToast() hook.
// Supports types: success, error, warning, info. Auto-dismisses after 4s.
// Uses .toast-container and .toast-animate CSS classes from globals.css.
// =============================================================================

// -- Toast type configuration: icon + color scheme --
const TOAST_CONFIG = {
  success: { icon: '✓', bg: 'bg-success-50', border: 'border-success-500', text: 'text-success-700' },
  error:   { icon: '✕', bg: 'bg-danger-50',  border: 'border-danger-500',  text: 'text-danger-700' },
  warning: { icon: '⚠', bg: 'bg-warning-50', border: 'border-warning-500', text: 'text-warning-700' },
  info:    { icon: 'ℹ', bg: 'bg-info-50',    border: 'border-info-500',    text: 'text-info-600' },
};

// -- Context for consuming toasts anywhere in the tree --
const ToastContext = createContext(null);

// =============================================================================
// useToast() — Hook to trigger toasts from any component
// Usage: const { addToast } = useToast();
//        addToast('Saved!', 'success');
// =============================================================================
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast() must be used within a <ToastProvider>');
  }
  return ctx;
}

// =============================================================================
// <ToastProvider> — Wrap your app (or a subtree) with this component
// =============================================================================
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Incrementing ID for each toast so React can key them properly
  const idRef = useRef(0);

  // -- Add a new toast notification --
  const addToast = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // -- Manually dismiss a toast (clicking the X) --
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* ============ Toast container — fixed top-right ============ */}
      <div className="toast-container">
        {toasts.map((toast) => {
          const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
          return (
            <div
              key={toast.id}
              className={`
                toast-animate flex items-center gap-3
                px-4 py-3 rounded-lg border-l-4 shadow-lg
                ${config.bg} ${config.border} ${config.text}
                min-w-[280px] max-w-sm
              `}
            >
              {/* Type icon */}
              <span className="text-base font-bold flex-shrink-0">{config.icon}</span>

              {/* Message text */}
              <span className="text-sm font-medium flex-1">{toast.message}</span>

              {/* Dismiss button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
