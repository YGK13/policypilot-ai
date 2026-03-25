'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

// =============================================================================
// TOPBAR — Top navigation bar for the AI HR Pilot platform
// Shows: view title, Employee/Admin mode toggle, employee dropdown,
// notification bell with real notification panel, and dynamic user avatar.
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
  // Notification props from AppShell context (passed by layout)
  notifications = [],
  onMarkRead,
  onClearAll,
}) {
  const pathname = usePathname();
  const title = VIEW_TITLES[pathname] || 'AI HR Pilot';
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  // -- Count unread notifications --
  const unreadCount = notifications.filter(n => !n.read).length;

  // -- Close dropdown on outside click --
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    }
    if (showNotifs) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifs]);

  // -- Dynamic user initials from current employee --
  const initials = employee
    ? `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`
    : 'AH';
  const displayName = employee
    ? `${employee.firstName} ${employee.lastName?.[0]}.`
    : 'AI HR Pilot';

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

        {/* -- Employee dropdown selector (admin mode shows all, employee mode shows current) -- */}
        {mode === 'admin' && employees.length > 0 && (
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

        {/* -- Employee mode: show current employee label instead of dropdown -- */}
        {mode === 'employee' && employee && (
          <span className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            {employee.firstName} {employee.lastName} — {employee.department}
          </span>
        )}

        {/* -- Notification bell with dropdown -- */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-danger-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* -- Notification dropdown panel -- */}
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={() => { onClearAll?.(); setShowNotifs(false); }}
                    className="text-xs text-brand-600 hover:text-brand-700 cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { onMarkRead?.(n.id); }}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                        n.read ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          n.type === 'critical' ? 'bg-danger-500' :
                          n.type === 'warning' ? 'bg-warning-500' :
                          n.type === 'success' ? 'bg-success-500' :
                          'bg-brand-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 leading-tight">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.detail}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(n.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* -- User avatar pill (dynamic from current employee) -- */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">{displayName}</p>
            <p className="text-[11px] text-gray-500 leading-tight capitalize">{mode}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
