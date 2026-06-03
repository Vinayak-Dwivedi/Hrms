"use client";

import { AlertCircle, Eye, EyeOff, Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { signIn } from "@/lib/hrms-client";

const schema = z.object({
  email: z.string().min(1, "Login ID is required.").email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

// Flat underline-only input styling shared by both fields.
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

export function EmployeeLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      const user = await signIn(parsed.data.email, parsed.data.password);
      const dest =
        user.role === "manager" ? "/manager/dashboard" : "/dashboard";
      router.push(dest);
      router.refresh();
    } catch (e) {
      setError((e as Error).message ?? "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col" noValidate onSubmit={onSubmit}>
      {/* Login ID */}
      <div className="mb-5">
        <label
          htmlFor="login-email"
          className="block text-[13px] font-semibold mb-1.5"
          style={{ color: "#1f2937" }}
        >
          Login ID
        </label>
        <div style={fieldShellStyle}>
          <span
            className="absolute inset-y-0 left-0 flex items-center justify-center pointer-events-none"
            style={{ width: ICON_BOX, color: "#9ca3af" }}
          >
            <User size={16} />
          </span>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your login ID"
            style={inputBaseStyle}
          />
        </div>
      </div>

      {/* Password */}
      <div className="mb-2">
        <label
          htmlFor="login-password"
          className="block text-[13px] font-semibold mb-1.5"
          style={{ color: "#1f2937" }}
        >
          Password
        </label>
        <div style={fieldShellStyle}>
          <span
            className="absolute inset-y-0 left-0 flex items-center justify-center pointer-events-none"
            style={{ width: ICON_BOX, color: "#9ca3af" }}
          >
            <Lock size={16} />
          </span>
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
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

      <div className="flex justify-end mb-6">
        <a
          href="/forgot-password"
          className="text-[12px] font-semibold no-underline"
          style={{ color: "#e91e8c" }}
        >
          Forgot Password?
        </a>
      </div>

      {error && (
        <div
          className="flex items-start gap-2 rounded-lg mb-4"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "8px 12px",
            fontSize: 12,
          }}
          role="alert"
        >
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full text-[15px] font-bold text-white rounded-lg"
        style={{
          height: 50,
          background: submitting ? "#f471a8" : "#e91e63",
          border: "none",
          cursor: submitting ? "not-allowed" : "pointer",
          letterSpacing: 0.2,
        }}
      >
        {submitting ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
