import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser, canManageTeam } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  password: z.string().min(6),
});

export async function GET() {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: employees } = await supabaseAdmin
    .from("users")
    .select("id,name,email,image,phone,role,active")
    .eq("organizationId", user.organizationId)
    .order("name", { ascending: true });
  const list = employees ?? [];

  for (const e of list) {
    const { data: tasks } = await supabaseAdmin
      .from("sourcing_tasks")
      .select("id,title,status")
      .eq("assignedToId", e.id)
      .not("status", "in", "(DISTRIBUTED,UNAVAILABLE)");
    (e as any).tasksAssigned = tasks ?? [];
  }

  return NextResponse.json(list);
}

// Admin creates a user directly with email/password (no invite needed)
export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageTeam(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, name, role, password } = parsed.data;
  const emailLower = email.toLowerCase();

  // Check if user already exists
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", emailLower)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create the user
  const { data: newUser, error } = await supabaseAdmin
    .from("users")
    .insert({
      email: emailLower,
      name: name || emailLower.split("@")[0],
      passwordHash,
      role,
      organizationId: user.organizationId,
      active: true,
    })
    .select("id,name,email,role,active")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newUser, { status: 201 });
}
