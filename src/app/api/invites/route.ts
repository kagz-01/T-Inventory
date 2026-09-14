import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser, canManageTeam, canInviteRole } from "@/lib/permissions";
import { inviteCreateSchema } from "@/lib/validation";
import { logOrgEvent } from "@/lib/orgAudit";
import nodemailer from "nodemailer";

const INVITE_EXPIRY_DAYS = 7;

function getTransporter() {
  const host = process.env.EMAIL_SERVER_HOST;
  const port = process.env.EMAIL_SERVER_PORT;
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: port ? Number(port) : 587,
    secure: port === "465",
    auth: { user, pass },
  });
}

function buildInviteEmail(opts: {
  to: string;
  role: string;
  orgName: string;
  inviteUrl: string;
  inviterName: string;
}) {
  const roleLabel = opts.role === "ADMIN" ? "Admin" : opts.role === "MANAGER" ? "Manager" : "Employee";
  return {
    from: `"${opts.orgName}" <${process.env.EMAIL_FROM || "no-reply@touchlineltd.co.ke"}>`,
    to: opts.to,
    subject: `You're invited to join ${opts.orgName} as ${roleLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">You've been invited</h2>
        <p style="color: #555; font-size: 14px; margin-bottom: 24px;">
          <strong>${opts.inviterName}</strong> has invited you to join <strong>${opts.orgName}</strong> as a <strong>${roleLabel}</strong>.
        </p>
        <a href="${opts.inviteUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Accept Invitation
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          This link expires in ${INVITE_EXPIRY_DAYS} days. If you weren't expecting this, you can ignore this email.
        </p>
      </div>
    `,
  };
}

function buildWhatsAppMessage(opts: {
  role: string;
  orgName: string;
  inviteUrl: string;
}) {
  const roleLabel = opts.role === "ADMIN" ? "Admin" : opts.role === "MANAGER" ? "Manager" : "Employee";
  return encodeURIComponent(
    `Hi! You've been invited to join *${opts.orgName}* as a *${roleLabel}* on the Touchline Inventory platform.\n\n` +
    `Click the link below to accept:\n${opts.inviteUrl}\n\n` +
    `This link expires in ${INVITE_EXPIRY_DAYS} days.`
  );
}

// Lists pending/expired/revoked invites for the caller's org
export async function GET() {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === "ADMIN" || user.role === "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: invites } = await supabaseAdmin.from('invites').select('*').eq('organizationId', user.organizationId).neq('status', 'ACCEPTED').order('createdAt', { ascending: false });
  const list = invites ?? [];
  for (const inv of list) {
    if (inv.invitedById) {
      const { data: inviter } = await supabaseAdmin.from('users').select('id,name,email').eq('id', inv.invitedById).maybeSingle();
      (inv as any).invitedBy = inviter ?? null;
    }
  }
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === "ADMIN" || user.role === "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = inviteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  if (!canInviteRole(user.role, parsed.data.role)) {
    return NextResponse.json(
      { error: "Managers can only invite Employees. Only an Admin can invite a Manager or Admin." },
      { status: 403 }
    );
  }

  const { data: existingMember } = await supabaseAdmin.from('users').select('*').eq('email', email).eq('organizationId', user.organizationId).maybeSingle();
  if (existingMember) {
    return NextResponse.json({ error: "That email is already a member of your team." }, { status: 409 });
  }
  const { data: existingPending } = await supabaseAdmin.from('invites').select('*').eq('email', email).eq('organizationId', user.organizationId).eq('status', 'PENDING').maybeSingle();
  if (existingPending) {
    return NextResponse.json(
      { error: "There's already a pending invite for that email. Resend it instead." },
      { status: 409 }
    );
  }

  const { data: invite } = await supabaseAdmin.from('invites').insert({
    email,
    role: parsed.data.role,
    organizationId: user.organizationId,
    invitedById: user.id,
    expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  }).select().maybeSingle();

  await logOrgEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    type: "INVITE_SENT",
    targetEmail: email,
    toValue: parsed.data.role,
  });

  // Build invite URL
  const origin = process.env.NEXTAUTH_URL || "https://app.touchlineltd.co.ke";
  const inviteUrl = `${origin}/invite/${invite.token}`;

  // Get org name
  const { data: org } = await supabaseAdmin.from('organizations').select('name').eq('id', user.organizationId).maybeSingle();
  const orgName = org?.name || "Touchline";

  // Try to send email
  let emailSent = false;
  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail(
        buildInviteEmail({
          to: email,
          role: parsed.data.role,
          orgName,
          inviteUrl,
          inviterName: user.name || user.email || "Admin",
        })
      );
      emailSent = true;
    } catch (err) {
      console.error("[invite] Email send failed:", err);
    }
  }

  // Build WhatsApp link
  const whatsappMessage = buildWhatsAppMessage({
    role: parsed.data.role,
    orgName,
    inviteUrl,
  });
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  return NextResponse.json({
    invite,
    emailSent,
    inviteUrl,
    whatsappUrl,
  }, { status: 201 });
}
