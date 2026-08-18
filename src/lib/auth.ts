import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase";
import { Role } from "@/types/dbEnums";
import { logOrgEvent } from "@/lib/orgAudit";

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
  const { data } = await supabaseAdmin.from('users').select('*').eq('email', email).maybeSingle();
  return data;
}

export const authOptions: NextAuthOptions = {
  // Using JWT sessions while migrating away from Prisma. Consider a proper
  // Supabase adapter for NextAuth if you want server-stored sessions.
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  session: { strategy: "jwt" },
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
      const orgCountRes = await supabaseAdmin.from('organizations').select('id', { head: true, count: 'exact' });
      const orgCount = orgCountRes.count ?? 0;
      if (orgCount === 0 && process.env.ADMIN_BOOTSTRAP_EMAIL && email === process.env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase()) {
        return true;
      }

      const { data: invite } = await supabaseAdmin
        .from('invites')
        .select('*')
        .eq('email', email)
        .eq('status', 'PENDING')
        .gt('expiresAt', new Date().toISOString())
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (invite) return true;

      return "/login?error=AccessDenied";
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      const email = user.email.toLowerCase();

      // Case 1: org bootstrap — create Organization #1 and make them Admin.
      const orgCountRes = await supabaseAdmin.from('organizations').select('id', { head: true, count: 'exact' });
      const orgCount = orgCountRes.count ?? 0;
      if (orgCount === 0 && process.env.ADMIN_BOOTSTRAP_EMAIL && email === process.env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase()) {
        const { data: org } = await supabaseAdmin.from('organizations').insert({ name: 'My Organization', contactEmail: email }).select().maybeSingle();
        if (org) {
          await supabaseAdmin.from('users').update({ role: Role.ADMIN, organizationId: org.id }).eq('id', user.id);
          await logOrgEvent({ organizationId: org.id, actorId: user.id, type: 'ORG_UPDATED', note: 'Organization created via admin bootstrap sign-in' });
        }
        return;
      }

      // Case 2: consume a pending invite.
      const { data: invite } = await supabaseAdmin
        .from('invites')
        .select('*')
        .eq('email', email)
        .eq('status', 'PENDING')
        .gt('expiresAt', new Date().toISOString())
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (invite) {
        await supabaseAdmin.from('users').update({ role: invite.role, organizationId: invite.organizationId }).eq('id', user.id);
        await supabaseAdmin.from('invites').update({ status: 'ACCEPTED', acceptedAt: new Date().toISOString() }).eq('id', invite.id);
        await logOrgEvent({ organizationId: invite.organizationId, actorId: user.id, type: 'INVITE_ACCEPTED', targetEmail: email, toValue: invite.role });
        return;
      }
    },
  },
};
