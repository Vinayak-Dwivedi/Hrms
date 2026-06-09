import { env } from "@/env";

export type PhoneVerificationSmsParams = {
  to: string;
  employeeName: string;
  otp: string;
  expiresInMinutes: number;
};

function buildSmsBody(params: PhoneVerificationSmsParams): string {
  return `${env.COMPANY_NAME}: Your mobile verification code is ${params.otp}. Valid for ${params.expiresInMinutes} minutes.`;
}

export function isSmsConfigured(): boolean {
  return Boolean(
    env.TWILIO_ACCOUNT_SID &&
      env.TWILIO_AUTH_TOKEN &&
      env.TWILIO_FROM_NUMBER,
  );
}

export async function sendPhoneVerificationOtp(
  params: PhoneVerificationSmsParams,
): Promise<void> {
  const body = buildSmsBody(params);

  if (isSmsConfigured()) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(
      `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
    ).toString("base64");
    const form = new URLSearchParams({
      To: params.to,
      From: env.TWILIO_FROM_NUMBER!,
      Body: body,
    });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `SMS delivery failed (${res.status})${detail ? `: ${detail}` : ""}`,
      );
    }
    return;
  }

  if (env.NODE_ENV !== "production") {
    console.info("[sms] SMS not configured — phone OTP (dev log):");
    console.info(`To: ${params.to}`);
    console.info(`Message: ${body}`);
    console.info(`OTP: ${params.otp}`);
    return;
  }

  throw new Error("SMS is not configured for phone verification.");
}
