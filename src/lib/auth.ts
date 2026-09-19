import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { Role } from "@/types/dbEnums";
import { logOrgEvent } from "@/lib/orgAudit";

// ----------------------------------------------------------------------------
// Access model: invite-only, no self-serve signup.
//
// Sign-in paths (all handled in the `signIn` callback):
//   1. Returning user (email exists in users table) → allowed if active
//   2. Bootstrap (no orgs exist, email matches ADMIN_BOOTSTRAP_EMAIL) → create org + user
//   3. Pending invite → create user with invited role/org
//   4. Credentials (email/password) → password check, then same as above
//
// Since we use JWT sessions (no DB adapter), `events.createUser` never fires.
// All user creation and role/org assignment happens in `signIn`.
// Role + organizationId are stored on the JWT via the `jwt` callback.
// ----------------------------------------------------------------------------

async function findUserByEmail(email: string) {
  const { data } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  return data;
}

async function getOrgCount() {
  const { count } = await supabaseAdmin
    .from("organizations")
    .select("id", { head: true, count: "exact" });
  return count ?? 0;
}

async function findPendingInvite(email: string) {
  const { data } = await supabaseAdmin
    .from("invites")
    .select("*")
    .eq("email", email)
    .eq("status", "PENDING")
    .gt("expiresAt", new Date().toISOString())
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function createBootstrapOrgAndUser(
  email: string,
  name: string | null | undefined,
  image: string | null | undefined
) {
  // Create organization
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .insert({ name: "My Organization", contactEmail: email })
    .select()
    .maybeSingle();

  if (!org) return null;

  // Create user as admin of the new org
  const { data: user } = await supabaseAdmin
    .from("users")
    .insert({
      email,
      name: name || email.split("@")[0],
      image,
      role: Role.ADMIN,
      organizationId: org.id,
      active: true,
    })
    .select()
    .maybeSingle();

  if (user) {
    await logOrgEvent({
      organizationId: org.id,
      actorId: user.id,
      type: "ORG_UPDATED",
      note: "Organization created via admin bootstrap sign-in",
    });
  }

  return user;
}

async function createInvitedUser(
  email: string,
  name: string | null | undefined,
  image: string | null | undefined,
  invite: any
) {
  // Create user with the role and org from the invite
  const { data: user } = await supabaseAdmin
    .from("users")
    .insert({
      email,
      name: name || email.split("@")[0],
      image,
      role: invite.role,
      organizationId: invite.organizationId,
      active: true,
    })
    .select()
    .maybeSingle();

  if (user) {
    // Consume the invite
    await supabaseAdmin
      .from("invites")
      .update({ status: "ACCEPTED", acceptedAt: new Date().toISOString() })
      .eq("id", invite.id);

    await logOrgEvent({
      organizationId: invite.organizationId,
      actorId: user.id,
      type: "INVITE_ACCEPTED",
      targetEmail: email,
      toValue: invite.role,
    });
  }

  return user;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase();
        const user = await findUserByEmail(email);

        if (!user || !user.passwordHash) return null;
        if (!user.active) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login/team",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // On first sign-in (user is provided), attach role + org to token
      if (user) {
        const email = user.email?.toLowerCase();
        if (email) {
          const dbUser = await findUserByEmail(email);
          if (dbUser) {
            token.dbUserId = dbUser.id;
            token.role = dbUser.role;
            token.organizationId = dbUser.organizationId;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.dbUserId as string;
        (session.user as any).role = token.role as Role;
        (session.user as any).organizationId = token.organizationId as string | null;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();

      // Credentials provider: check password here (authorize already did, but belt-and-suspenders)
      if (account?.provider === "credentials") {
        // authorize() already validated — just check returning user or allow
        const existing = await findUserByEmail(email);
        if (existing) return existing.active ? true : "/login?error=AccessDenied";
        return "/login?error=AccessDenied";
      }

      // Google OAuth flow:
      // Check if returning user
      const existing = await findUserByEmail(email);
      if (existing) {
        return existing.active ? true : "/login?error=AccessDenied";
      }

      // New user — check bootstrap or invite
      const orgCount = await getOrgCount();

      // Bootstrap: first user, no orgs yet
      if (
        orgCount === 0 &&
        process.env.ADMIN_BOOTSTRAP_EMAIL &&
        email === process.env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase()
      ) {
        const newUser = await createBootstrapOrgAndUser(
          email,
          user.name,
          user.image
        );
        return newUser ? true : "/login?error=AccessDenied";
      }

      // Pending invite
      const invite = await findPendingInvite(email);
      if (invite) {
        const newUser = await createInvitedUser(
          email,
          user.name,
          user.image,
          invite
        );
        return newUser ? true : "/login?error=AccessDenied";
      }

      // No valid path — deny
      return "/login?error=AccessDenied";
    },
  },
};
