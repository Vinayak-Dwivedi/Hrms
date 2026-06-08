import * as auditRepo from "@/modules/hr-onboarding/repositories/audit.repository";

export async function queryAuditLogs(params: {
  employeeId?: number;
  action?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}) {
  return auditRepo.listAuditLogs({
    employeeId: params.employeeId,
    action: params.action,
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(params.to) : undefined,
    limit: params.limit,
    offset: params.offset,
  });
}
