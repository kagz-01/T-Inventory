import { prisma } from "@/lib/prisma";
import { OrgAuditEventType } from "@prisma/client";

export async function logOrgEvent(params: {
  organizationId: string;
  actorId?: string | null;
  type: OrgAuditEventType;
  targetEmail?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  note?: string | null;
}) {
  await prisma.orgAuditLog.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId ?? null,
      type: params.type,
      targetEmail: params.targetEmail ?? null,
      fromValue: params.fromValue ?? null,
      toValue: params.toValue ?? null,
      note: params.note ?? null,
    },
  });
}
