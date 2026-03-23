'use client';

// =============================================================================
// SEARCH BAR — Text input with search icon
// Renders a search field with a magnifying glass icon on the left.
// Fully controlled via value + onChange props.
// =============================================================================

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      {/* Search icon — positioned inside the input on the left */}
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>

      {/* Input field — left padding makes room for the icon */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-10 pr-4 py-2
          text-sm text-gray-900 placeholder-gray-400
          bg-white border border-gray-200 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400
          transition-colors
        "
      />
    </div>
  );
}
