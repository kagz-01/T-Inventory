import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Fetch user with password hash
  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("id, passwordHash")
    .eq("id", user.id)
    .maybeSingle();

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Verify current password
  if (!dbUser.passwordHash) {
    return NextResponse.json(
      { error: "Your account uses Google sign-in. Set a password by contacting your admin." },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  // Hash new password
  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);

  // Update password
  const { error } = await supabaseAdmin
    .from("users")
    .update({ passwordHash: newHash })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
