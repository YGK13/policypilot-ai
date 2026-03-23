'use client';

import { useEffect, useCallback } from 'react';

// =============================================================================
// MODAL — Reusable modal dialog with overlay, header, body, footer
// Supports 'default' and 'lg' sizes. Closes on Escape key and overlay click.
// =============================================================================

// -- Size mappings for the modal panel width --
const SIZE_CLASSES = {
  default: 'max-w-md',
  lg: 'max-w-2xl',
};

export default function Modal({ isOpen, onClose, title, children, footer, size = 'default' }) {
  // -- Close on Escape key press --
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // -- Don't render anything when closed --
  if (!isOpen) return null;

  return (
    // Overlay — semi-transparent backdrop, click to close
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel — stop click propagation so clicking inside doesn't close */}
      <div
        className={`
          ${SIZE_CLASSES[size] || SIZE_CLASSES.default}
          w-full mx-4 bg-white rounded-xl shadow-2xl
          transform transition-all
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============ Header — title + close button ============ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            {/* X icon — simple SVG */}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ============ Body — scrollable content area ============ */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto text-sm text-gray-700">
          {children}
        </div>

        {/* ============ Footer — optional action buttons ============ */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
