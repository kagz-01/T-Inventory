import { Role } from "@/types/dbEnums";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type CurrentUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  organizationId: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as CurrentUser;
}

// Use this instead of getCurrentUser() in any route/page that touches org-scoped
// data (materials, vendors, tasks, projects, employees). Returns null if the
// caller isn't signed in OR hasn't been attached to an organization yet
// (mid-bootstrap, or something went wrong with invite consumption) — callers
// should treat that the same as "not authorized" rather than leak data.
export async function requireOrgUser(): Promise<
  (CurrentUser & { organizationId: string }) | null
> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;
  return user as CurrentUser & { organizationId: string };
}

export function canManageCatalogue(role: Role | string) {
  return role === Role.ADMIN || role === Role.MANAGER;
}

export function canApprovePurchase(role: Role | string) {
  return role === Role.ADMIN || role === Role.MANAGER;
}

export function canReassignTask(role: Role | string) {
  // Admin/Manager can reassign anyone's task. Employees can only hand off their own
  // (checked separately against task.assignedToId in the route handler).
  return role === Role.ADMIN || role === Role.MANAGER || role === Role.EMPLOYEE;
}

export function canManageTeam(role: Role | string) {
  // Send/revoke invites, view member list. Role changes are Admin-only (see isAdmin).
  return role === Role.ADMIN || role === Role.MANAGER;
}

export function canInviteRole(inviterRole: Role | string, targetRole: Role | string) {
  // Managers can only invite Employees. Only Admin can invite a Manager or another Admin.
  if (inviterRole === Role.ADMIN) return true;
  if (inviterRole === Role.MANAGER) return targetRole === Role.EMPLOYEE;
  return false;
}

export function isAdmin(role: Role | string) {
  return role === Role.ADMIN;
}
