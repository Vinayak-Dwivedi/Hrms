"use client";

import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { onboardingLogin } from "../api/onboarding.client";
import { onboardingBtnPrimaryFullClass } from "../constants/onboarding-theme";
import { OnboardingInlineError } from "./OnboardingErrorState";

const schema = z.object({
  email: z.string().min(1, "Username is required.").email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

const FIELD_HEIGHT = 46;
const ICON_BOX = 36;

const fieldShellStyle: React.CSSProperties = {
  position: "relative",
  borderBottom: "1px solid #e5e7eb",
};

const inputBaseStyle: React.CSSProperties = {
  width: "100%",
  height: FIELD_HEIGHT,
  paddingLeft: ICON_BOX,
  paddingRight: 14,
  border: "none",
  background: "transparent",
  outline: "none",
  fontSize: 14,
  color: "#111827",
};

interface Props {
  token: string;
  workEmail: string;
  expiresAt: string | null;
}

export default function OnboardingLoginForm({
  token,
  workEmail,
  expiresAt,
}: Props) {
  const router = useRouter();
  const [email] = useState(workEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid credentials.");
      return;
    }

    setSubmitting(true);
    try {
      const { redirectTo } = await onboardingLogin({
        token,
        email: parsed.data.email,
        password: parsed.data.password,
      });
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col" noValidate onSubmit={onSubmit}>
      {expiryLabel && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 m-0">
          This invitation expires on {expiryLabel}. Please complete login before
          then.
        </p>
      )}

      <div className="mb-5">
        <label
          htmlFor="onboarding-email"
          className="block text-[13px] font-semibold mb-1.5"
          style={{ color: "#1f2937" }}
        >
          Username
        </label>
        <div style={fieldShellStyle}>
          <span
            className="absolute inset-y-0 left-0 flex items-center justify-center pointer-events-none"
            style={{ width: ICON_BOX, color: "#9ca3af" }}
          >
            <User size={16} />
          </span>
          <input
            id="onboarding-email"
            name="email"
            type="email"
            readOnly
            value={email}
            style={{ ...inputBaseStyle, color: "#6b7280" }}
          />
        </div>
      </div>

      <div className="mb-6">
        <label
          htmlFor="onboarding-password"
          className="block text-[13px] font-semibold mb-1.5"
          style={{ color: "#1f2937" }}
        >
          Temporary Password
        </label>
        <div style={fieldShellStyle}>
          <span
            className="absolute inset-y-0 left-0 flex items-center justify-center pointer-events-none"
            style={{ width: ICON_BOX, color: "#9ca3af" }}
          >
            <Lock size={16} />
          </span>
          <input
            id="onboarding-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your temporary password"
            style={{ ...inputBaseStyle, paddingRight: ICON_BOX }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center justify-center"
            style={{
              width: ICON_BOX,
              color: "#9ca3af",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && <OnboardingInlineError message={error} />}

      <button
        type="submit"
        disabled={submitting}
        className={onboardingBtnPrimaryFullClass}
        style={{ height: 50, letterSpacing: 0.2 }}
      >
        {submitting ? "Signing in…" : "Continue to Onboarding"}
      </button>
    </form>
  );
}
