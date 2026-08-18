import { supabaseAdmin } from "@/lib/supabase";
import { OrgAuditEventType } from "@/types/dbEnums";

export async function logOrgEvent(params: {
  organizationId: string;
  actorId?: string | null;
  type: OrgAuditEventType | string;
  targetEmail?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  note?: string | null;
}) {
  await supabaseAdmin.from('org_audit_logs').insert({
    id: undefined, // Placeholder for ID
    organizationId: params.organizationId,
    actorId: params.actorId ?? null,
    type: params.type,
    targetEmail: params.targetEmail ?? null,
    fromValue: params.fromValue ?? null,
    toValue: params.toValue ?? null,
    note: params.note ?? null,
  });
}
