"use client";

import { useState, useCallback, useEffect } from "react";
import { useApp } from "../AppShell";
import { useToast } from "@/components/layout/ToastProvider";
import { ROLES } from "../AppShell";

// ============================================================================
// TEAM MANAGEMENT PAGE — Invite members, assign roles, manage org users
//
// Loads live users from Neon via /api/team on mount.
// Falls back to DEMO_USERS when DB is not available.
// Admins can: invite new members, change roles, deactivate/reactivate users.
// Role changes are optimistic with rollback — awaited and synced to Neon.
// ============================================================================

// -- Role badge colors mapped to pill classes --
const ROLE_PILLS = {
  hr_admin:  "pill-brand",
  hr_staff:  "pill-green",
  legal:     "pill-red",
  employee:  "pill-blue",
};

// -- All selectable roles for the invite form + inline editor --
const ROLE_OPTIONS = [
  { value: "employee",  label: "Employee" },
  { value: "hr_staff",  label: "HR Staff" },
  { value: "hr_admin",  label: "HR Administrator" },
  { value: "legal",     label: "Legal Counsel" },
];

// -- US states for jurisdiction field --
const US_STATES = [
  "Federal","California","New York","Texas","Illinois","Colorado",
  "Washington","Massachusetts","New Jersey","Michigan","Florida",
  "North Carolina","Georgia","Pennsylvania","Ohio","Virginia",
  "Arizona","Oregon","Minnesota","Connecticut",
];

// -- Normalize a Neon row → UI shape --
function normalizeDbUser(row) {
  return {
    id:         row.id,
    name:       row.name,
    email:      row.email,
    role:       row.role || "employee",
    department: row.department || "—",
    title:      row.title || "—",
    state:      row.state || "—",
    isActive:   row.is_active !== false,
    joined:     row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    initials:   row.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    fromDb:     true,
  };
}

// -- Avatar color based on initials for visual distinction --
const AVATAR_COLORS = [
  "bg-brand-500","bg-green-500","bg-amber-500","bg-red-500",
  "bg-purple-500","bg-pink-500","bg-indigo-500","bg-teal-500",
];
function avatarColor(name) {
  let hash = 0;
  for (const c of name) hash = (hash << 5) - hash + c.charCodeAt(0);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function TeamContent() {
  const { mode, currentUser, orgId, addAudit } = useApp();
  const { addToast } = useToast();

  // -- Team state: Neon users or empty list --
  const [members, setMembers] = useState([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [editingRole, setEditingRole] = useState(null);   // userId whose role is being edited inline
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // -- Invite form state --
  const [inviteForm, setInviteForm] = useState({
    name: "", email: "", role: "employee",
    department: "", title: "", state: "",
  });
  const [inviting, setInviting] = useState(false);

  // -- Load team from Neon on mount --
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/team?orgId=${orgId || "default"}`);
        const data = await res.json();
        if (!data.demo && Array.isArray(data.users) && data.users.length > 0) {
          setMembers(data.users.map(normalizeDbUser));
        }
      } catch {
        // Non-fatal: show empty state
      } finally {
        setDbLoaded(true);
      }
    };
    load();
  }, [orgId]);

  // -- Filtered view --
  const filtered = members.filter((m) => {
    const matchSearch = !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.department.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || m.role === filterRole;
    return matchSearch && matchRole;
  });

  // -- Invite a new member (optimistic + awaited + rollback on failure) --
  const handleInvite = useCallback(async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      addToast("error", "Missing Fields", "Name and email are required");
      return;
    }
    setInviting(true);
    const tempId = `temp-${Date.now()}`;
    const inviteSnapshot = { ...inviteForm };
    const newMember = {
      id: tempId,
      ...inviteSnapshot,
      isActive: true,
      joined: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      initials: inviteSnapshot.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
      fromDb: false,
    };

    // -- Optimistic add --
    setMembers((prev) => [newMember, ...prev]);
    setInviteForm({ name: "", email: "", role: "employee", department: "", title: "", state: "" });
    setShowInvite(false);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: orgId || "default", user: inviteSnapshot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invite failed");

      // -- Replace temp ID with real DB id --
      if (data.user?.id) {
        setMembers((prev) => prev.map((m) => m.id === tempId ? normalizeDbUser(data.user) : m));
      }
      addAudit("TEAM_INVITE", `Invited ${inviteSnapshot.name} (${inviteSnapshot.role}) — ${inviteSnapshot.email}`, "info");
      addToast("success", "Invitation Sent", `${inviteSnapshot.name} will receive an email invite`);
    } catch (err) {
      // -- Rollback: remove the optimistic member --
      setMembers((prev) => prev.filter((m) => m.id !== tempId));
      addToast("error", "Invite Failed", err.message || "Could not save to database");
    } finally {
      setInviting(false);
    }
  }, [inviteForm, orgId, addAudit, addToast]);

  // -- Change a member's role (optimistic + awaited + rollback on failure) --
  const handleRoleChange = useCallback(async (member, newRole) => {
    if (newRole === member.role) { setEditingRole(null); return; }
    const prevRole = member.role;
    // -- Optimistic update --
    setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, role: newRole } : m));
    setEditingRole(null);

    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: orgId || "default", userId: member.id, action: "update_role", role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Role update failed");

      addAudit("ROLE_CHANGE", `${member.name}: ${prevRole} → ${newRole}`, "warning");
      addToast("info", "Role Updated", `${member.name} is now ${ROLE_OPTIONS.find(r => r.value === newRole)?.label}`);
    } catch (err) {
      // -- Rollback: restore previous role --
      setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, role: prevRole } : m));
      addToast("error", "Role Update Failed", err.message || "Could not save to database");
    }
  }, [orgId, addAudit, addToast]);

  // -- Deactivate / reactivate a member (optimistic + awaited + rollback on failure) --
  const handleToggleActive = useCallback(async (member) => {
    const newActive = !member.isActive;
    const prevActive = member.isActive;
    // -- Optimistic update --
    setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, isActive: newActive } : m));

    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: orgId || "default", userId: member.id, action: "set_active", isActive: newActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status update failed");

      addAudit(
        newActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
        `${member.name} (${member.role})`,
        newActive ? "success" : "warning"
      );
      addToast(newActive ? "success" : "warning", newActive ? "User Reactivated" : "User Deactivated", member.name);
    } catch (err) {
      // -- Rollback: restore previous active state --
      setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, isActive: prevActive } : m));
      addToast("error", "Update Failed", err.message || "Could not save to database");
    }
  }, [orgId, addAudit, addToast]);

  // -- Admin-only guard --
  if (mode === "employee" || mode === "legal") {
    return (
      <div className="p-6 max-w-[600px] mx-auto text-center py-20">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Admin Access Required</h2>
        <p className="text-sm text-gray-500">Team management is available to HR Administrators only.</p>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400";

  // -- Role summary counts --
  const roleCounts = ROLE_OPTIONS.reduce((acc, r) => {
    acc[r.value] = members.filter((m) => m.role === r.value && m.isActive).length;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-[1200px] mx-auto">

      {/* ============ Header ============ */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Team Members</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your organization&apos;s HR team, roles, and permissions.
            {dbLoaded && members.length > 0 && (
              <span className="ml-2 text-brand-600 font-medium">
                {members.filter(m => m.isActive).length} active · {members.length} total
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="px-4 py-2.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 cursor-pointer transition-colors"
        >
          + Invite Member
        </button>
      </div>

      {/* ============ Role Summary Cards ============ */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {ROLE_OPTIONS.map((r) => (
          <button
            key={r.value}
            onClick={() => setFilterRole(filterRole === r.value ? "all" : r.value)}
            className={`bg-white rounded-xl border p-4 text-left transition-all cursor-pointer ${
              filterRole === r.value ? "border-brand-400 ring-2 ring-brand-100" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="text-xl font-bold text-gray-900">{roleCounts[r.value] || 0}</div>
            <div className="text-xs text-gray-500 mt-0.5">{r.label}</div>
          </button>
        ))}
      </div>

      {/* ============ Invite Form ============ */}
      {showInvite && (
        <div className="bg-white rounded-xl border border-brand-200 shadow-xs p-6 mb-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">👋 Invite New Member</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
              <input type="text" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} className={inputCls} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email *</label>
              <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className={inputCls} placeholder="jane@company.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
              <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })} className={inputCls}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
              <input type="text" value={inviteForm.department} onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })} className={inputCls} placeholder="Engineering" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
              <input type="text" value={inviteForm.title} onChange={(e) => setInviteForm({ ...inviteForm, title: e.target.value })} className={inputCls} placeholder="Software Engineer" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">State / Jurisdiction</label>
              <select value={inviteForm.state} onChange={(e) => setInviteForm({ ...inviteForm, state: e.target.value })} className={inputCls}>
                <option value="">Select…</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleInvite} disabled={inviting} className="px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-60 cursor-pointer transition-colors">
              {inviting ? "Sending…" : "Send Invite"}
            </button>
            <button onClick={() => setShowInvite(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 cursor-pointer">
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            The invited member will receive an email to set up their account. Role and access are applied immediately.
          </p>
        </div>
      )}

      {/* ============ Search + Filter Bar ============ */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or department…"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
        />
        {filterRole !== "all" && (
          <button
            onClick={() => setFilterRole("all")}
            className="px-3 py-2 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 cursor-pointer"
          >
            {ROLE_OPTIONS.find(r => r.value === filterRole)?.label} ×
          </button>
        )}
      </div>

      {/* ============ Member Table ============ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {!dbLoaded ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading team members…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">
              {members.length === 0 ? "No team members yet" : "No results found"}
            </h3>
            <p className="text-xs">
              {members.length === 0
                ? "Invite your first team member using the button above"
                : "Try a different search or filter"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  {["Member", "Role", "Department", "State", "Joined", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr
                    key={member.id}
                    className={`border-b border-gray-100 transition-colors ${member.isActive ? "hover:bg-gray-50" : "bg-gray-50/50 opacity-60"}`}
                  >
                    {/* Member avatar + name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(member.name)}`}>
                          {member.initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-400">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role — inline edit on click */}
                    <td className="px-4 py-3">
                      {editingRole === member.id ? (
                        <select
                          autoFocus
                          defaultValue={member.role}
                          onChange={(e) => handleRoleChange(member, e.target.value)}
                          onBlur={() => setEditingRole(null)}
                          className="text-xs border border-brand-400 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => mode === "hr_admin" && setEditingRole(member.id)}
                          title={mode === "hr_admin" ? "Click to change role" : undefined}
                          className={`pill ${ROLE_PILLS[member.role] || "pill-gray"} ${mode === "hr_admin" ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                        >
                          {ROLE_OPTIONS.find(r => r.value === member.role)?.label || member.role}
                        </button>
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600">{member.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.state}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{member.joined}</td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span className={`pill ${member.isActive ? "pill-green" : "pill-gray"}`}>
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {mode === "hr_admin" && member.id !== currentUser?.id && (
                        <button
                          onClick={() => handleToggleActive(member)}
                          className={`text-xs font-semibold cursor-pointer ${
                            member.isActive
                              ? "text-red-500 hover:text-red-700"
                              : "text-green-600 hover:text-green-800"
                          }`}
                        >
                          {member.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ Role Legend ============ */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-700 mb-3">Role Permissions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(ROLES).map(([key, def]) => (
            <div key={key} className="text-xs">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${def.color}`} />
                <span className="font-semibold text-gray-800">{def.label}</span>
              </div>
              <p className="text-gray-400 leading-tight">{def.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  return <TeamContent />;
}
