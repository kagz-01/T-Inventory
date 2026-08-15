import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// ----------------------------------------------------------------------------
// Access model: this app is invite-only (no self-serve signup).
// A Google sign-in is allowed only if ONE of these is true:
//   1. The email already has a User row (returning member) — always allowed,
//      subject to the `active` flag check below.
//   2. No Organization exists yet AND the email matches ADMIN_BOOTSTRAP_EMAIL —
//      this is the very first sign-in that creates Organization #1.
//   3. The email has a PENDING, non-expired Invite — joining an existing org.
// Anything else is denied and bounced to /login?error=AccessDenied.
//
// The actual org/role assignment for a brand-new user happens in the
// `events.createUser` hook below, since the adapter creates the User row
// *after* the signIn callback returns true, and we need that row's id first.
// ----------------------------------------------------------------------------

async function isReturningUser(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  return existing;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        (session.user as any).role = (user as any).role as Role;
        (session.user as any).organizationId = (user as any).organizationId as string | null;
      }
      return session;
    },
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();

      const existing = await isReturningUser(email);
      if (existing) {
        // Deactivated accounts are blocked at the door, even if they still have
        // a valid Google session elsewhere.
        return existing.active ? true : "/login?error=AccessDenied";
      }

      // Brand-new user — allowed only via org bootstrap or a pending invite.
      const orgCount = await prisma.organization.count();
      if (
        orgCount === 0 &&
        process.env.ADMIN_BOOTSTRAP_EMAIL &&
        email === process.env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase()
      ) {
        return true;
      }

      const invite = await prisma.invite.findFirst({
        where: { email, status: "PENDING", expiresAt: { gt: new Date() } },
      });
      if (invite) return true;

      return "/login?error=AccessDenied";
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      const email = user.email.toLowerCase();

      // Case 1: org bootstrap — this is the first-ever user and matches the
      // bootstrap email. Create Organization #1 and make them Admin.
      const orgCount = await prisma.organization.count();
      if (
        orgCount === 0 &&
        process.env.ADMIN_BOOTSTRAP_EMAIL &&
        email === process.env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase()
      ) {
        const org = await prisma.organization.create({
          data: { name: "My Organization", contactEmail: email },
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { role: Role.ADMIN, organizationId: org.id },
        });
        await prisma.orgAuditLog.create({
          data: {
            organizationId: org.id,
            actorId: user.id,
            type: "ORG_UPDATED",
            note: "Organization created via admin bootstrap sign-in",
          },
        });
        return;
      }

      // Case 2: consume a pending invite.
      const invite = await prisma.invite.findFirst({
        where: { email, status: "PENDING", expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      });
      if (invite) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: invite.role, organizationId: invite.organizationId },
        });
        await prisma.invite.update({
          where: { id: invite.id },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        });
        await prisma.orgAuditLog.create({
          data: {
            organizationId: invite.organizationId,
            actorId: user.id,
            type: "INVITE_ACCEPTED",
            targetEmail: email,
            toValue: invite.role,
          },
        });
        return;
      }

      // Shouldn't be reachable — signIn callback should have denied this user
      // before the adapter ever created a row. Leave organizationId null; every
      // org-scoped route treats that as "no access" rather than throwing.
    },
  },
};
