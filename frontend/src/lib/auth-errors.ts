export type AuthErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Login ID or password is incorrect.",
  PERSONAL_EMAIL_LOGIN:
    "Personal email cannot be used to sign in. Use your work email or employee ID.",
  ACCOUNT_INACTIVE: "Your account is not active. Please contact HR.",
  ONBOARDING_INACTIVE: "Your account is not active. Please contact HR.",
  VALIDATION_ERROR: "Please enter both login ID and password.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  INTERNAL_ERROR: "Unable to reach the server. Check your connection and try again.",
};

export const SESSION_NOT_ESTABLISHED_MESSAGE =
  "Sign-in succeeded but session could not be established. Please try again.";

export const NETWORK_ERROR_MESSAGE =
  "Unable to reach the server. Check your connection and try again.";

export function mapAuthError(body: AuthErrorBody, status: number): string {
  const code = body.error?.code;
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }
  if (body.error?.message) {
    return body.error.message;
  }
  if (status === 422) {
    return AUTH_ERROR_MESSAGES.VALIDATION_ERROR;
  }
  if (status === 429) {
    return AUTH_ERROR_MESSAGES.RATE_LIMITED;
  }
  if (status >= 500) {
    return AUTH_ERROR_MESSAGES.INTERNAL_ERROR;
  }
  return `Sign-in failed (${status})`;
}
