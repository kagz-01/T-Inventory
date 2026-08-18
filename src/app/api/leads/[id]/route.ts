import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { Role } from "@/types/dbEnums";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["new", "contacted", "converted", "closed"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === Role.EMPLOYEE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin.from('leads').select('*').eq('id', params.id).maybeSingle();
  if (!existing || existing.organization_id !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // "converted" is only ever set by the /convert endpoint, which also links
  // the resulting task - block it here so a lead can't look converted
  // without actually having a task behind it.
  if (parsed.data.status === "converted") {
    return NextResponse.json(
      { error: "Use the Convert to Task action instead" },
      { status: 400 }
    );
  }

  const { data: lead } = await supabaseAdmin.from('leads').update({ status: parsed.data.status }).eq('id', params.id).select().maybeSingle();
  return NextResponse.json(lead);
}
