'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// =============================================================================
// SIDEBAR — Main navigation sidebar for the PolicyPilot AI platform
// Uses Next.js Link for real page navigation between file-based routes.
// Grouped nav: Core, Platform, Admin. Footer shows integration statuses.
// =============================================================================

// -- Navigation items organized by group --
// Each item: { key (used for active matching), href (route path), icon, label, badge?, statusDot? }
const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { key: 'dashboard',   href: '/',             icon: '📊', label: 'Dashboard' },
      { key: 'chat',        href: '/chat',         icon: '💬', label: 'AI Chat' },
      { key: 'tickets',     href: '/tickets',      icon: '🎫', label: 'Ticket Queue', badge: 12 },
      { key: 'documents',   href: '/documents',    icon: '📄', label: 'Documents' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { key: 'integrations', href: '/integrations', icon: '🔗', label: 'Integrations' },
      { key: 'policies',     href: '/policies',     icon: '📋', label: 'Policies & Jurisdictions' },
      { key: 'analytics',    href: '/analytics',    icon: '📈', label: 'Analytics' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { key: 'audit',    href: '/audit',    icon: '🔍', label: 'Audit Log' },
      { key: 'settings', href: '/settings', icon: '⚙️', label: 'Settings' },
      { key: 'billing',  href: '/billing',  icon: '💳', label: 'Billing & Plans' },
      { key: 'api-keys', href: '/api-keys', icon: '🔑', label: 'API Keys', statusDot: 'green' },
    ],
  },
];

// -- Integration statuses shown in the sidebar footer --
const INTEGRATIONS = [
  { name: 'BambooHR', status: 'Live',   color: 'bg-emerald-400' },
  { name: 'Slack',    status: 'Live',   color: 'bg-emerald-400' },
  { name: 'Greenhouse', status: 'Config', color: 'bg-amber-400' },
];

export default function Sidebar({ currentView }) {
  // -- Determine active route from the URL pathname --
  const pathname = usePathname();

  // -- Helper: check if a nav item is the currently active page --
  function isActive(item) {
    // Dashboard is special — it's at /
    if (item.href === '/') return pathname === '/';
    return pathname.startsWith(item.href);
  }

  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col h-screen flex-shrink-0">

      {/* ============ Logo / Brand header ============ */}
      <div className="px-5 py-5 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="text-xl">⚡</span>
          <span className="text-base font-bold tracking-tight text-white">PolicyPilot</span>
          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-brand-500 rounded text-white uppercase tracking-wider">
            AI
          </span>
        </Link>
        <p className="text-[11px] text-gray-500 mt-1">Enterprise HR Intelligence</p>
      </div>

      {/* ============ Navigation groups ============ */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {/* Group label */}
            <p className="px-2 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              {group.label}
            </p>

            {/* Nav items within the group */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                      transition-colors no-underline
                      ${active
                        ? 'bg-brand-500/20 text-brand-300 font-medium'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }
                    `}
                  >
                    {/* Icon emoji */}
                    <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>

                    {/* Label */}
                    <span className="flex-1 text-left truncate">{item.label}</span>

                    {/* Optional badge count */}
                    {item.badge != null && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-500 text-white rounded-full min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}

                    {/* Optional status dot (e.g., green = active) */}
                    {item.statusDot && (
                      <span className={`w-2 h-2 rounded-full ${
                        item.statusDot === 'green' ? 'bg-emerald-400' : 'bg-gray-500'
                      }`} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ============ Footer — integration status indicators ============ */}
      <div className="px-4 py-4 border-t border-gray-800">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Integrations
        </p>
        <div className="space-y-2">
          {INTEGRATIONS.map((int) => (
            <div key={int.name} className="flex items-center gap-2 text-xs text-gray-400">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${int.color}`} />
              <span className="flex-1">{int.name}</span>
              <span className="text-gray-600">{int.status}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
