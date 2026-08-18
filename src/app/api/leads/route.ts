import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { Role } from "@/types/dbEnums";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === Role.EMPLOYEE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined; // new | contacted | converted | closed

  let query = supabaseAdmin.from('leads').select('*').eq('organization_id', user.organizationId).order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data: leads } = await query;
  return NextResponse.json(leads ?? []);
}
