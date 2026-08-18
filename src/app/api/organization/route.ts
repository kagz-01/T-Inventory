import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser, isAdmin } from "@/lib/permissions";
import { organizationUpdateSchema } from "@/lib/validation";
import { logOrgEvent } from "@/lib/orgAudit";

export async function GET() {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: org } = await supabaseAdmin.from('organizations').select('*').eq('id', user.organizationId).maybeSingle();
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(org);
}

export async function PATCH(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user.role)) {
    return NextResponse.json({ error: "Only Admin can update organization settings" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = organizationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: org } = await supabaseAdmin.from('organizations').update(parsed.data).eq('id', user.organizationId).select().maybeSingle();

  await logOrgEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    type: "ORG_UPDATED",
    note: "Organization profile updated",
  });
  return NextResponse.json(org);
}
