"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Users,
  Building2,
  UserPlus,
  Shield,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  Key,
  Link as LinkIcon,
  MessageCircle,
  Lock,
} from "lucide-react";

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
  token: string;
  expiresAt: string;
  invitedBy?: { name: string | null };
};

type Org = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "EMPLOYEE";
  const isAdmin = role === "ADMIN";

  const [org, setOrg] = useState<Org | null>(null);
  const [orgNameDraft, setOrgNameDraft] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("EMPLOYEE");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Create user form
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("EMPLOYEE");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [orgRes, membersRes, invitesRes] = await Promise.all([
      fetch("/api/organization"),
      fetch("/api/employees"),
      isAdmin ? fetch("/api/invites") : Promise.resolve(null),
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
  }, [session]);

  // Send invite
  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setSending(true);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setInviteError(typeof data.error === "string" ? data.error : "Couldn't send invite");
      return;
    }
    const emailStatus = data.emailSent ? "Email sent" : "Email not configured (share the link below)";
    setInviteSuccess(`Invite created! ${emailStatus}`);
    setInviteEmail("");
    setInviteRole("EMPLOYEE");
    loadAll();
  }

  // Create user with password
  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: createEmail,
        name: createName || undefined,
        password: createPassword,
        role: createRole,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json();
      setCreateError(typeof data.error === "string" ? data.error : "Couldn't create user");
      return;
    }
    setCreatedCredentials({ email: createEmail, password: createPassword });
    setCreateEmail("");
    setCreateName("");
    setCreatePassword("");
    setCreateRole("EMPLOYEE");
    loadAll();
  }

  // Change password
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    setChangingPassword(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setChangingPassword(false);
    if (!res.ok) {
      const data = await res.json();
      setPasswordError(typeof data.error === "string" ? data.error : "Couldn't change password");
      return;
    }
    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
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

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function shareWhatsApp(token: string, role: string) {
    const url = `${window.location.origin}/invite/${token}`;
    const orgName = org?.name || "Touchline";
    const roleLabel = role === "ADMIN" ? "Admin" : role === "MANAGER" ? "Manager" : "Employee";
    const message = encodeURIComponent(
      `Hi! You've been invited to join *${orgName}* as a *${roleLabel}* on the Touchline Inventory platform.\n\nClick the link below to accept:\n${url}\n\nThis link expires in 7 days.`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  }

  function shareSMS(token: string, role: string) {
    const url = `${window.location.origin}/invite/${token}`;
    const orgName = org?.name || "Touchline";
    const roleLabel = role === "ADMIN" ? "Admin" : role === "MANAGER" ? "Manager" : "Employee";
    const message = encodeURIComponent(
      `Hi! You've been invited to join ${orgName} as a ${roleLabel} on Touchline Inventory. Accept here: ${url}`
    );
    window.open(`sms:?body=${message}`, "_blank");
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account</p>
        </div>

        {/* Change Password (all users) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-3 max-w-md">
              <Input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
              />
              <Input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
              />
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              {passwordSuccess && <p className="text-sm text-green-600">Password changed successfully!</p>}
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your organization and team</p>
      </div>

      {/* Company Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md">
            <Input value={orgNameDraft} onChange={(e) => setOrgNameDraft(e.target.value)} placeholder="Organization name" />
            <Button variant="outline" onClick={saveOrgName}>Save</Button>
          </div>
        </CardContent>
      </Card>

      {/* Create User with Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Create User Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Create an account directly. The user signs in with email and password.
          </p>
          <form onSubmit={createUser} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input type="email" required value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="Email address" />
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Full name (optional)" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input type="password" required minLength={6} value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Password (min 6 chars)" />
              <select value={createRole} onChange={(e) => setCreateRole(e.target.value)} className="input">
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create Account"}</Button>
          </form>

          {/* Show created credentials */}
          {createdCredentials && (
            <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Account created! Share these credentials:</p>
              <div className="space-y-1 text-sm font-mono">
                <p><span className="text-muted-foreground">Email:</span> {createdCredentials.email}</p>
                <p><span className="text-muted-foreground">Password:</span> {createdCredentials.password}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`);
                  }}
                >
                  <Copy className="h-3 w-3" /> Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const msg = encodeURIComponent(`Your Touchline Inventory login:\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\n\nLogin at: ${window.location.origin}/login`);
                    window.open(`https://wa.me/?text=${msg}`, "_blank");
                  }}
                >
                  <MessageCircle className="h-3 w-3" /> Share via WhatsApp
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCreatedCredentials(null)}>Dismiss</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Invite */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Send Invite Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Send an invite via email or WhatsApp. They&apos;ll sign in with Google to accept.
          </p>
          <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-2">
            <Input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@company.com" className="flex-1" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="input w-auto">
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button type="submit" disabled={sending}>{sending ? "Sending..." : "Send Invite"}</Button>
          </form>
          {inviteError && <p className="text-sm text-destructive mt-2">{inviteError}</p>}
          {inviteSuccess && <p className="text-sm text-green-600 mt-2">{inviteSuccess}</p>}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Pending Invites
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i}><Skeleton className="h-12 w-full" /></div>)}</div>
          ) : invites.filter((i) => i.status === "PENDING").length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pending invites</p>
          ) : (
            <div className="space-y-3">
              {invites.filter((i) => i.status === "PENDING").map((i) => (
                <div key={i.id} className="flex flex-col gap-3 p-3 rounded-lg border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{i.email}</span>
                        <Badge variant="secondary" className="text-[10px]">{i.role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Expires {new Date(i.expiresAt).toLocaleDateString()}
                        {i.invitedBy?.name ? ` · invited by ${i.invitedBy.name}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => copyInviteLink(i.token)} title="Copy invite link">
                        {copiedId === i.token ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => shareWhatsApp(i.token, i.role)} title="Share via WhatsApp">
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => shareSMS(i.token, i.role)} title="Share via SMS">
                        <Mail className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => resendInvite(i.token)} title="Resend invite">
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => revokeInvite(i.id)} title="Revoke invite" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
                    <LinkIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{typeof window !== "undefined" ? `${window.location.origin}/invite/${i.token}` : `/invite/${i.token}`}</span>
                    <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 shrink-0" onClick={() => copyInviteLink(i.token)}>
                      {copiedId === i.token ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i}><Skeleton className="h-12 w-full" /></div>)}</div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const initials = (m.name || m.email || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className={`text-sm font-medium ${!m.active ? "text-muted-foreground line-through" : ""}`}>{m.name || m.email}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-12 sm:ml-0">
                      <select value={m.role} onChange={(e) => updateMemberRole(m.id, e.target.value)} className="text-xs border rounded-md bg-background px-2 py-1">
                        <option value="ADMIN">Admin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="EMPLOYEE">Employee</option>
                      </select>
                      {isAdmin && (
                        <Button variant={m.active ? "destructive" : "outline"} size="sm" onClick={() => toggleActive(m.id, m.active)} className="h-7 text-xs">
                          {m.active ? "Deactivate" : "Reactivate"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password (Admin) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Change Your Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-3 max-w-md">
            <Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" />
            <Input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" />
            <Input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-green-600">Password changed successfully!</p>}
            <Button type="submit" disabled={changingPassword}>{changingPassword ? "Changing..." : "Change Password"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
