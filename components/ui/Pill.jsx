'use client';

// =============================================================================
// PILL — Status pill / tag component
// Uses .pill and .pill-{variant} CSS classes from globals.css design system.
// Renders as an inline badge for statuses, categories, and labels.
// =============================================================================

// -- Valid variants map to CSS classes defined in globals.css --
const VARIANT_CLASSES = {
  brand: 'pill-brand',
  green: 'pill-green',
  amber: 'pill-amber',
  red: 'pill-red',
  blue: 'pill-blue',
  gray: 'pill-gray',
  outline: 'pill-outline',
};

export default function Pill({ variant = 'gray', children }) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.gray;

  return (
    <span className={`pill ${variantClass}`}>
      {children}
    </span>
  );
}
