'use client';

import { usePathname } from 'next/navigation';

// =============================================================================
// TOPBAR — Top navigation bar for the PolicyPilot AI platform
// Shows: view title (derived from pathname), Employee/Admin mode toggle,
// employee dropdown, notification bell, and user avatar pill.
// =============================================================================

// -- Human-readable titles keyed by first pathname segment --
const VIEW_TITLES = {
  '/':             'Dashboard',
  '/chat':         'AI Chat',
  '/tickets':      'Ticket Queue',
  '/documents':    'Documents',
  '/integrations': 'Integrations',
  '/policies':     'Policies & Jurisdictions',
  '/analytics':    'Analytics',
  '/audit':        'Audit Log',
  '/settings':     'Settings',
  '/billing':      'Billing & Plans',
  '/api-keys':     'API Keys',
};

export default function Topbar({
  mode,
  onModeChange,
  employee,
  employees = [],
  onEmployeeChange,
}) {
  const pathname = usePathname();
  const title = VIEW_TITLES[pathname] || 'PolicyPilot AI';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">

      {/* ============ Left — View title ============ */}
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      {/* ============ Right — Controls cluster ============ */}
      <div className="flex items-center gap-4">

        {/* -- Employee / Admin mode switch -- */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => onModeChange('employee')}
            className={`
              px-3 py-1.5 rounded-md transition-colors cursor-pointer
              ${mode === 'employee'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            Employee
          </button>
          <button
            onClick={() => onModeChange('admin')}
            className={`
              px-3 py-1.5 rounded-md transition-colors cursor-pointer
              ${mode === 'admin'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            Admin
          </button>
        </div>

        {/* -- Employee dropdown selector -- */}
        {employees.length > 0 && (
          <select
            value={employee?.id || ''}
            onChange={(e) => onEmployeeChange(e.target.value)}
            className="
              text-sm text-gray-700 bg-white border border-gray-200 rounded-lg
              px-3 py-1.5
              focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400
              cursor-pointer
            "
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} — {emp.state}
              </option>
            ))}
          </select>
        )}

        {/* -- Notification bell -- */}
        <button
          className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
        </button>

        {/* -- User avatar pill -- */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
            YK
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">Yuri K.</p>
            <p className="text-[11px] text-gray-500 leading-tight">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
