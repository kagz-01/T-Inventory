import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Public (unauthenticated) — the invite landing page needs to show org context
// ("You've been invited to join Touchline as Employee") before the person signs
// in with Google. Only returns non-sensitive fields.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { data: invite } = await supabaseAdmin.from('invites').select('*').eq('token', params.token).maybeSingle();
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  const { data: org } = await supabaseAdmin.from('organizations').select('name,logoUrl').eq('id', invite.organizationId).maybeSingle();

  const expired = invite.status === 'PENDING' && new Date(invite.expiresAt) < new Date();

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    status: expired ? 'EXPIRED' : invite.status,
    organizationName: org?.name ?? null,
    organizationLogoUrl: org?.logoUrl ?? null,
  });
}
