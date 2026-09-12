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
  return role === Role.ADMIN;
}

export function canApprovePurchase(role: Role | string) {
  // Managers may approve purchases when delegated
  return role === Role.ADMIN || role === Role.MANAGER;
}

export function canReassignTask(role: Role | string) {
  // Admin and Manager can reassign tasks. Employees can only update their own status
  // (assignment ownership checks happen in route handlers).
  return role === Role.ADMIN || role === Role.MANAGER;
}

export function canManageTeam(role: Role | string) {
  // Only Admin can send/revoke invites and view member list.
  return role === Role.ADMIN;
}

export function canInviteRole(inviterRole: Role | string, targetRole: Role | string) {
  // Admins can invite Managers and Employees. Managers may invite Employees only.
  if (inviterRole === Role.ADMIN) return true;
  if (inviterRole === Role.MANAGER && targetRole === Role.EMPLOYEE) return true;
  return false;
}

export function isAdmin(role: Role | string) {
  return role === Role.ADMIN;
}
