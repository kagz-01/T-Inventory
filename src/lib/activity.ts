import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function logActivity(params: {
  organizationId: string;
  actorId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await supabaseAdmin.from("activity_events").insert({
      id: randomUUID(),
      organizationId: params.organizationId,
      actorId: params.actorId,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? null,
    });
  } catch {
    // Silent fail — activity logging should never block the main operation
  }
}
