"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Member = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  active: boolean;
  tasksAssigned?: { id: string }[];
};

type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  invitedBy?: { name: string | null };
};

type Org = { id: string; name: string; contactEmail: string | null; contactPhone: string | null };

export default function SettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "EMPLOYEE";
  const isAdmin = role === "ADMIN";
  const canManageTeam = role === "ADMIN" || role === "MANAGER";

  const [org, setOrg] = useState<Org | null>(null);
  const [orgNameDraft, setOrgNameDraft] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [orgRes, membersRes, invitesRes] = await Promise.all([
      fetch("/api/organization"),
      fetch("/api/employees"),
      canManageTeam ? fetch("/api/invites") : Promise.resolve(null),
    ]);
    if (orgRes.ok) {
      const o = await orgRes.json();
      setOrg(o);
      setOrgNameDraft(o.name);
    }
    if (membersRes.ok) setMembers(await membersRes.json());
    if (invitesRes && invitesRes.ok) setInvites(await invitesRes.json());
    setLoading(false);
  }

  useEffect(() => {
    if (session) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Couldn't send invite");
      return;
    }
    setInviteEmail("");
    setInviteRole("EMPLOYEE");
    loadAll();
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/invites/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function resendInvite(id: string) {
    await fetch(`/api/invites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend" }),
    });
    loadAll();
  }

  async function updateMemberRole(id: string, newRole: string) {
    await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    loadAll();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    loadAll();
  }

  async function saveOrgName() {
    await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgNameDraft }),
    });
    loadAll();
  }

  if (!canManageTeam) {
    return (
      <div className="card">
        <p className="text-sm text-gray-500">Only Admins and Managers can view team settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand-navy">Team &amp; Settings</h1>

      {/* Company profile */}
      <div className="card animate-fade-in-up">
        <h2 className="font-semibold text-brand-navy mb-3">Company Profile</h2>
        {isAdmin ? (
          <div className="flex flex-col sm:flex-row gap-2 max-w-md">
            <input
              value={orgNameDraft}
              onChange={(e) => setOrgNameDraft(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Organization name"
            />
            <button onClick={saveOrgName} className="btn-secondary">
              Save
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-700">{org?.name}</p>
        )}
      </div>

      {/* Invite form */}
      <div className="card animate-fade-in-up">
        <h2 className="font-semibold text-brand-navy mb-3">Invite a Teammate</h2>
        <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="EMPLOYEE">Employee</option>
            {isAdmin && <option value="MANAGER">Manager</option>}
            {isAdmin && <option value="ADMIN">Admin</option>}
          </select>
          <button type="submit" disabled={sending} className="btn-primary whitespace-nowrap">
            {sending ? "Sending…" : "Send Invite"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {!isAdmin && (
          <p className="text-xs text-gray-400 mt-2">
            Managers can only invite Employees. Ask an Admin to invite a Manager.
          </p>
        )}
      </div>

      {/* Pending invites */}
      <div className="card animate-fade-in-up">
        <h2 className="font-semibold text-brand-navy mb-3">Pending Invites</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : invites.filter((i) => i.status === "PENDING").length === 0 ? (
          <p className="text-sm text-gray-500">No pending invites.</p>
        ) : (
          <ul className="space-y-2">
            {invites
              .filter((i) => i.status === "PENDING")
              .map((i) => (
                <li
                  key={i.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm border-b border-gray-100 pb-2"
                >
                  <div>
                    <span className="font-medium text-gray-800">{i.email}</span>{" "}
                    <span className="badge bg-gray-100 text-gray-600 ml-1">{i.role}</span>
                    <div className="text-xs text-gray-400">
                      Expires {new Date(i.expiresAt).toLocaleDateString()}
                      {i.invitedBy?.name ? ` · invited by ${i.invitedBy.name}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => resendInvite(i.id)} className="btn-secondary text-xs px-2 py-1">
                      Resend
                    </button>
                    <button
                      onClick={() => revokeInvite(i.id)}
                      className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Revoke
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Members */}
      <div className="card animate-fade-in-up">
        <h2 className="font-semibold text-brand-navy mb-3">Team Members</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm border-b border-gray-100 pb-2"
              >
                <div>
                  <span className={`font-medium ${m.active ? "text-gray-800" : "text-gray-400 line-through"}`}>
                    {m.name || m.email}
                  </span>
                  <div className="text-xs text-gray-400">{m.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <select
                      value={m.role}
                      onChange={(e) => updateMemberRole(m.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-1 py-0.5"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="EMPLOYEE">Employee</option>
                    </select>
                  ) : (
                    <span className="badge bg-gray-100 text-gray-600">{m.role}</span>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => toggleActive(m.id, m.active)}
                      className={`text-xs px-2 py-1 rounded-md border ${
                        m.active
                          ? "border-red-200 text-red-600 hover:bg-red-50"
                          : "border-green-200 text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {m.active ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
