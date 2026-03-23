'use client';

// =============================================================================
// TOGGLE — Switch component with optional label and description
// Uses .toggle and .toggle.on CSS classes from globals.css design system.
// Accessible: uses role="switch" with aria-checked for screen readers.
// =============================================================================

export default function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center gap-3">
      {/* Toggle track — the sliding switch itself */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        className={`toggle ${enabled ? 'on' : ''}`}
        onClick={() => onChange(!enabled)}
      />

      {/* Optional label + description text */}
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-medium text-gray-900">{label}</span>
          )}
          {description && (
            <span className="text-xs text-gray-500">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
