import { AdminAuditLogModel } from "@/models/AdminAuditLog";
import { toSerializable } from "@/lib/serialize";

interface CreateAdminAuditLogInput {
  actorUserId: string;
  action: string;
  targetModel: string;
  targetId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

export async function createAdminAuditLog(input: CreateAdminAuditLogInput) {
  return AdminAuditLogModel.create({
    actorUserId: input.actorUserId,
    action: input.action,
    targetModel: input.targetModel,
    targetId: input.targetId ?? "",
    summary: input.summary,
    before: input.before === undefined ? null : toSerializable(input.before),
    after: input.after === undefined ? null : toSerializable(input.after),
    metadata: input.metadata ?? {}
  });
}
