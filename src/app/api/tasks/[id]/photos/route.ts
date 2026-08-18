import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { logTaskEvent } from "@/lib/taskEvents";
import { z } from "zod";

const photoSchema = z.object({
  url: z.string().url(),
  kind: z.enum(["SAMPLE", "ARTWORK", "BRANDED_PROOF", "DELIVERY_PROOF"]).default("SAMPLE"),
  caption: z.string().optional(),
});

// Client uploads the file directly to Supabase Storage first (see src/lib/uploadPhoto.ts),
// then calls this route with the resulting public URL to attach it to the task.
// `kind` distinguishes a sourcing sample photo from client artwork, a photo of the
// finished branded item, or proof of delivery - each shows up in a different place
// on the task detail page.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: task } = await supabaseAdmin.from('sourcing_tasks').select('*').eq('id', params.id).maybeSingle();
  if (!task || task.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = photoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: photo } = await supabaseAdmin.from('task_photos').insert({ taskId: params.id, url: parsed.data.url, kind: parsed.data.kind, caption: parsed.data.caption }).select().maybeSingle();

  await logTaskEvent({
    taskId: params.id,
    actorId: user.id,
    type: parsed.data.kind === "ARTWORK" ? "ARTWORK_UPLOADED" : "PHOTO_ADDED",
  });

  return NextResponse.json(photo, { status: 201 });
}
