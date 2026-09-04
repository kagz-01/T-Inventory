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
  Settings,
  Mail,
  Users,
  Building2,
  UserPlus,
  Shield,
  Trash2,
  RotateCcw,
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

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

  if (!isAdmin) {
    return (
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <Shield className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Admin only</p>
          <p className="text-xs text-muted-foreground mt-1">
            Only admins can view and manage team settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your organization and team
        </p>
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
            <Input
              value={orgNameDraft}
              onChange={(e) => setOrgNameDraft(e.target.value)}
              placeholder="Organization name"
            />
            <Button variant="outline" onClick={saveOrgName}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite a Teammate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="input w-auto"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button type="submit" disabled={sending}>
              {sending ? "Sending..." : "Send Invite"}
            </Button>
          </form>
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Pending Invites
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : invites.filter((i) => i.status === "PENDING").length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No pending invites
            </p>
          ) : (
            <div className="space-y-3">
              {invites
                .filter((i) => i.status === "PENDING")
                .map((i) => (
                  <div
                    key={i.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{i.email}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {i.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Expires {new Date(i.expiresAt).toLocaleDateString()}
                        {i.invitedBy?.name
                          ? ` · invited by ${i.invitedBy.name}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resendInvite(i.id)}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeInvite(i.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
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
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const initials = (m.name || m.email || "U")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                return (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            !m.active
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          {m.name || m.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-12 sm:ml-0">
                      <select
                        value={m.role}
                        onChange={(e) =>
                          updateMemberRole(m.id, e.target.value)
                        }
                        className="text-xs border rounded-md bg-background px-2 py-1"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="EMPLOYEE">Employee</option>
                      </select>
                      {isAdmin && (
                        <Button
                          variant={m.active ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => toggleActive(m.id, m.active)}
                          className="h-7 text-xs"
                        >
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
    </div>
  );
}
