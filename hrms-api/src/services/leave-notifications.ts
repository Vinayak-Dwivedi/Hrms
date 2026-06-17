// Email notifications for the leave-approval lifecycle (M5). Uses the SES
// SMTP transport already configured for onboarding + verification mail.
//
// Each `notify*` function:
//   - Builds a default subject/text body
//   - Optionally substitutes a workflow-defined template via {{tokens}}
//   - Sends through nodemailer; silently logs to console if SMTP isn't set
//
// The functions are fire-and-forget — they catch their own errors and never
// block the parent request. Failed delivery shows up in pm2 logs.

import nodemailer from "nodemailer";
import { env } from "@/env";

export interface NotificationParticipants {
  employeeName: string;
  employeeWorkEmail: string | null;
  managerName?: string | null;
  managerWorkEmail?: string | null;
  hrEmail?: string | null;
}

export interface LeaveRequestSummary {
  id: number;
  leaveTypeName: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  days: number;
  durationType: string;
  reason: string;
}

export interface WorkflowEmailTemplate {
  subject?: string;
  body?: string;
}

function createTransport(): nodemailer.Transporter | null {
  // TEMP: outbound email is disabled (AWS SES not configured). Returning null
  // makes leave/offboarding notifications fall back to the console-log path,
  // so no SES call is made. Restore the body once email delivery is set up.
  return null;
  // if (!env.SMTP_HOST) return null;
  // return nodemailer.createTransport({
  //   host: env.SMTP_HOST,
  //   port: env.SMTP_PORT,
  //   secure: env.SMTP_SECURE,
  //   auth:
  //     env.SMTP_USER && env.SMTP_PASS
  //       ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
  //       : undefined,
  // });
}

function applyTemplate(
  template: string | undefined,
  vars: Record<string, string>,
  fallback: string,
): string {
  const src = template && template.trim().length > 0 ? template : fallback;
  return src.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

async function send(to: string | string[], subject: string, text: string) {
  const transport = createTransport();
  const recipients = Array.isArray(to) ? to : [to];
  const filtered = recipients.filter((r) => !!r && r.includes("@"));
  if (filtered.length === 0) return;

  if (!transport) {
    if (env.NODE_ENV !== "production") {
      console.info("[leave-mail] SMTP not configured — dev log:");
      console.info(`To: ${filtered.join(", ")}`);
      console.info(`Subject: ${subject}`);
      console.info(text);
    }
    return;
  }
  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: filtered,
      subject,
      text,
    });
  } catch (err) {
    console.error("[leave-mail] send failed:", err);
  }
}

function buildVars(
  participants: NotificationParticipants,
  req: LeaveRequestSummary,
  extras: Record<string, string> = {},
): Record<string, string> {
  return {
    employeeName: participants.employeeName,
    employeeWorkEmail: participants.employeeWorkEmail ?? "",
    managerName: participants.managerName ?? "",
    leaveTypeName: req.leaveTypeName,
    fromDate: req.fromDate,
    toDate: req.toDate,
    days: String(req.days),
    durationType: req.durationType,
    reason: req.reason,
    companyName: env.COMPANY_NAME,
    ...extras,
  };
}

// ── 1. New request → manager ─────────────────────────────────────────────

export async function notifyManagerOnSubmission(
  participants: NotificationParticipants,
  req: LeaveRequestSummary,
  template?: WorkflowEmailTemplate,
): Promise<void> {
  if (!participants.managerWorkEmail) return;
  const vars = buildVars(participants, req);
  const subject = applyTemplate(
    template?.subject,
    vars,
    `[Leave Request] ${vars.employeeName} — ${vars.leaveTypeName} (${vars.days} day${vars.days === "1" ? "" : "s"})`,
  );
  const text = applyTemplate(
    template?.body,
    vars,
    [
      `Hi ${vars.managerName || "Manager"},`,
      "",
      `${vars.employeeName} has submitted a leave request:`,
      "",
      `- Type: ${vars.leaveTypeName}`,
      `- Dates: ${vars.fromDate} to ${vars.toDate} (${vars.days} day${vars.days === "1" ? "" : "s"}, ${vars.durationType})`,
      `- Reason: ${vars.reason}`,
      "",
      `Please review it in HRMS to approve, reject, or forward.`,
      "",
      `— ${vars.companyName} HRMS`,
    ].join("\n"),
  );
  await send(participants.managerWorkEmail, subject, text);
}

// ── 2. Approved → employee ───────────────────────────────────────────────

export async function notifyEmployeeOnApproval(
  participants: NotificationParticipants,
  req: LeaveRequestSummary,
  approverLabel: string,
  template?: WorkflowEmailTemplate,
): Promise<void> {
  const vars = buildVars(participants, req, { approver: approverLabel });
  const subject = applyTemplate(
    template?.subject,
    vars,
    `Your ${vars.leaveTypeName} request has been approved`,
  );
  const text = applyTemplate(
    template?.body,
    vars,
    [
      `Hi ${vars.employeeName},`,
      "",
      `Your leave request has been approved by ${vars.approver}.`,
      "",
      `- Type: ${vars.leaveTypeName}`,
      `- Dates: ${vars.fromDate} to ${vars.toDate} (${vars.days} day${vars.days === "1" ? "" : "s"})`,
      "",
      `Enjoy your time off.`,
      "",
      `— ${vars.companyName} HRMS`,
    ].join("\n"),
  );
  if (!participants.employeeWorkEmail) return;
  await send(participants.employeeWorkEmail, subject, text);
}

// ── 3. Rejected → employee ───────────────────────────────────────────────

export async function notifyEmployeeOnRejection(
  participants: NotificationParticipants,
  req: LeaveRequestSummary,
  approverLabel: string,
  remarks: string | null,
  template?: WorkflowEmailTemplate,
): Promise<void> {
  const vars = buildVars(participants, req, {
    approver: approverLabel,
    remarks: remarks ?? "",
  });
  const subject = applyTemplate(
    template?.subject,
    vars,
    `Your ${vars.leaveTypeName} request was rejected`,
  );
  const text = applyTemplate(
    template?.body,
    vars,
    [
      `Hi ${vars.employeeName},`,
      "",
      `Your leave request has been rejected by ${vars.approver}.`,
      "",
      `- Type: ${vars.leaveTypeName}`,
      `- Dates: ${vars.fromDate} to ${vars.toDate} (${vars.days} day${vars.days === "1" ? "" : "s"})`,
      remarks ? `- Remarks: ${remarks}` : "",
      "",
      `If you have questions, please reach out to your manager or HR.`,
      "",
      `— ${vars.companyName} HRMS`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  if (!participants.employeeWorkEmail) return;
  await send(participants.employeeWorkEmail, subject, text);
}

// ── 4. Forwarded → HR ────────────────────────────────────────────────────

export async function notifyHROnForward(
  participants: NotificationParticipants,
  req: LeaveRequestSummary,
  template?: WorkflowEmailTemplate,
): Promise<void> {
  if (!participants.hrEmail) return;
  const vars = buildVars(participants, req);
  const subject = applyTemplate(
    template?.subject,
    vars,
    `[HR Approval Needed] ${vars.employeeName} — ${vars.leaveTypeName}`,
  );
  const text = applyTemplate(
    template?.body,
    vars,
    [
      `Hi HR,`,
      "",
      `A leave request from ${vars.employeeName} has been forwarded to HR for review:`,
      "",
      `- Type: ${vars.leaveTypeName}`,
      `- Dates: ${vars.fromDate} to ${vars.toDate} (${vars.days} day${vars.days === "1" ? "" : "s"})`,
      `- Reason: ${vars.reason}`,
      vars.managerName ? `- Forwarded by: ${vars.managerName}` : "",
      "",
      `Please review in HRMS to approve or reject.`,
      "",
      `— ${vars.companyName} HRMS`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  await send(participants.hrEmail, subject, text);
}
