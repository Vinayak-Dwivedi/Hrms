import nodemailer from "nodemailer";
import { env } from "@/env";

export type OnboardingInvitationParams = {
  to: string;
  employeeName: string;
  workEmail: string;
  tempPassword: string;
  onboardingUrl: string;
  expiresAt: Date;
  companyName?: string;
  loginUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  websiteUrl?: string;
  tokenTtlHours?: number;
};

type ResolvedInvitationParams = Required<
  Pick<
    OnboardingInvitationParams,
    | "companyName"
    | "loginUrl"
    | "supportEmail"
    | "supportPhone"
    | "websiteUrl"
    | "tokenTtlHours"
  >
> &
  OnboardingInvitationParams;

function createTransport() {
  if (!env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
}

export function resolveLoginUrl(): string {
  if (env.LOGIN_BASE_URL) {
    return env.LOGIN_BASE_URL;
  }
  const base = env.ONBOARDING_BASE_URL.replace(/\/$/, "");
  if (base.endsWith("/employee/onboarding")) {
    return base.replace(/\/employee\/onboarding$/, "/login");
  }
  return `${base}/login`;
}

function emailFromSmtpFrom(): string | undefined {
  const angle = env.SMTP_FROM.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1];
  if (env.SMTP_FROM.includes("@")) return env.SMTP_FROM.trim();
  return undefined;
}

function resolveInvitationParams(
  params: OnboardingInvitationParams,
): ResolvedInvitationParams {
  return {
    ...params,
    companyName: params.companyName ?? env.COMPANY_NAME,
    loginUrl: params.loginUrl ?? resolveLoginUrl(),
    supportEmail:
      params.supportEmail ??
      env.COMPANY_SUPPORT_EMAIL ??
      emailFromSmtpFrom() ??
      "hr@company.com",
    supportPhone: params.supportPhone ?? env.COMPANY_SUPPORT_PHONE ?? "",
    websiteUrl: params.websiteUrl ?? env.COMPANY_WEBSITE ?? "",
    tokenTtlHours: params.tokenTtlHours ?? env.ONBOARDING_TOKEN_TTL_HOURS,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInvitationSubject(params: ResolvedInvitationParams): string {
  return `Welcome to ${params.companyName} – Complete Your Onboarding Within ${params.tokenTtlHours} Hours`;
}

function buildInvitationText(params: ResolvedInvitationParams): string {
  const expiryStr = params.expiresAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const supportPhoneLine = params.supportPhone
    ? `* Phone Number: ${params.supportPhone}`
    : "";
  const websiteLine = params.websiteUrl
    ? `${params.companyName}\n${params.websiteUrl}`
    : params.companyName;

  return [
    `Dear ${params.employeeName},`,
    "",
    `Welcome to ${params.companyName}!`,
    "",
    "Your employee account has been successfully created. To begin your onboarding process, please use the credentials and onboarding link provided below.",
    "",
    "Login Details",
    "",
    `* Username / Email ID: ${params.workEmail}`,
    `* Temporary Password: ${params.tempPassword}`,
    `* Login URL: ${params.loginUrl}`,
    "",
    `Onboarding Link (Valid for ${params.tokenTtlHours} Hours)`,
    "",
    params.onboardingUrl,
    "",
    `Important: This onboarding link is valid for ${params.tokenTtlHours} hours from the time this email was sent (expires ${expiryStr}). For security reasons, the link can only be used once. If the link expires, please contact HR or the support team to request a new onboarding invitation.`,
    "",
    "Next Steps",
    "",
    "1. Click the onboarding link above.",
    "2. Log in using your username and temporary password.",
    "3. Change your password when prompted.",
    "4. Complete your profile information.",
    "5. Upload the required documents, certificates, and supporting credentials.",
    "6. Submit your onboarding information for review.",
    "",
    "If you need any assistance, please contact us at:",
    "",
    `* Support Email: ${params.supportEmail}`,
    supportPhoneLine,
    "",
    `We look forward to having you on board and wish you great success with ${params.companyName}.`,
    "",
    "Best Regards,",
    "",
    websiteLine,
    params.supportEmail,
    params.supportPhone,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function buildInvitationHtml(params: ResolvedInvitationParams): string {
  const expiryStr = params.expiresAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const name = escapeHtml(params.employeeName);
  const company = escapeHtml(params.companyName);
  const workEmail = escapeHtml(params.workEmail);
  const tempPassword = escapeHtml(params.tempPassword);
  const loginUrl = escapeHtml(params.loginUrl);
  const onboardingUrl = escapeHtml(params.onboardingUrl);
  const supportEmail = escapeHtml(params.supportEmail);
  const supportPhone = escapeHtml(params.supportPhone);
  const websiteUrl = params.websiteUrl
    ? escapeHtml(params.websiteUrl)
    : "";

  const supportPhoneHtml = params.supportPhone
    ? `<li>Phone Number: ${supportPhone}</li>`
    : "";
  const websiteHtml = params.websiteUrl
    ? `<p><a href="${websiteUrl}">${websiteUrl}</a></p>`
    : "";

  return `
    <p>Dear ${name},</p>
    <p>Welcome to <strong>${company}</strong>!</p>
    <p>Your employee account has been successfully created. To begin your onboarding process, please use the credentials and onboarding link provided below.</p>
    <p><strong>Login Details</strong></p>
    <ul>
      <li>Username / Email ID: <a href="mailto:${workEmail}">${workEmail}</a></li>
      <li>Temporary Password: <strong>${tempPassword}</strong></li>
      <li>Login URL: <a href="${loginUrl}">${loginUrl}</a></li>
    </ul>
    <p><strong>Onboarding Link (Valid for ${params.tokenTtlHours} Hours)</strong></p>
    <p><a href="${onboardingUrl}">${onboardingUrl}</a></p>
    <p><strong>Important:</strong> This onboarding link is valid for <strong>${params.tokenTtlHours} hours</strong> from the time this email was sent (expires ${escapeHtml(expiryStr)}). For security reasons, the link can only be used once. If the link expires, please contact HR or the support team to request a new onboarding invitation.</p>
    <p><strong>Next Steps</strong></p>
    <ol>
      <li>Click the onboarding link above.</li>
      <li>Log in using your username and temporary password.</li>
      <li>Change your password when prompted.</li>
      <li>Complete your profile information.</li>
      <li>Upload the required documents, certificates, and supporting credentials.</li>
      <li>Submit your onboarding information for review.</li>
    </ol>
    <p>If you need any assistance, please contact us at:</p>
    <ul>
      <li>Support Email: <a href="mailto:${supportEmail}">${supportEmail}</a></li>
      ${supportPhoneHtml}
    </ul>
    <p>We look forward to having you on board and wish you great success with ${company}.</p>
    <p>Best Regards,</p>
    <p>
      <strong>${company}</strong><br/>
      ${websiteHtml}
      <a href="mailto:${supportEmail}">${supportEmail}</a><br/>
      ${params.supportPhone ? `${supportPhone}` : ""}
    </p>
  `.trim();
}

export async function sendOnboardingInvitation(
  params: OnboardingInvitationParams,
): Promise<void> {
  const resolved = resolveInvitationParams(params);
  const transport = createTransport();
  const subject = buildInvitationSubject(resolved);
  const text = buildInvitationText(resolved);
  const html = buildInvitationHtml(resolved);

  if (!transport) {
    console.info("[mailer] SMTP not configured — onboarding invitation (dev log):");
    console.info(`Subject: ${subject}`);
    console.info(text);
    return;
  }

  await transport.sendMail({
    from: env.SMTP_FROM,
    to: params.to,
    subject,
    text,
    html,
  });
}
