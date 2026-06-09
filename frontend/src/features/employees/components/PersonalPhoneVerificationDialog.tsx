"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  resendPersonalPhoneVerificationOtp,
  verifyPersonalPhoneOtp,
} from "../api/profile.client";
import {
  employeeBtnClass,
  employeeErrorBannerClass,
  employeeInputClass,
} from "../employee-theme";
import EmployeeModalShell from "./EmployeeModalShell";

interface Props {
  open: boolean;
  phone: string;
  initialCooldownSeconds?: number;
  onClose: () => void;
  onVerified: () => void | Promise<void>;
}

export default function PersonalPhoneVerificationDialog({
  open,
  phone,
  initialCooldownSeconds = 60,
  onClose,
  onVerified,
}: Props) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(initialCooldownSeconds);

  useEffect(() => {
    if (!open) {
      setOtp("");
      setError(null);
      setCooldown(initialCooldownSeconds);
      return;
    }
    setCooldown(initialCooldownSeconds);
  }, [open, initialCooldownSeconds]);

  useEffect(() => {
    if (!open || cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, cooldown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      await verifyPersonalPhoneOtp(code);
      toast.success("Mobile number verified successfully.");
      await onVerified();
      onClose();
    } catch (err) {
      setError((err as Error).message ?? "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      const result = await resendPersonalPhoneVerificationOtp();
      setCooldown(result.resendCooldownSeconds);
      toast.success("A new verification code has been sent.");
    } catch (err) {
      const apiErr = err as Error & { retryAfterSeconds?: number };
      if (apiErr.retryAfterSeconds) {
        setCooldown(apiErr.retryAfterSeconds);
      }
      setError(apiErr.message ?? "Could not resend code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <EmployeeModalShell
      maxWidthClass="max-w-md"
      onClose={onClose}
      open={open}
      title="Verify Mobile Number"
    >
      <form className="px-6 py-5 space-y-4" onSubmit={handleVerify}>
        <p className="text-sm text-gray-600 m-0">
          Enter the 6-digit code sent to{" "}
          <span className="font-medium text-gray-900">{phone}</span>. The code
          expires in 10 minutes.
        </p>

        {error ? (
          <div className={employeeErrorBannerClass} role="alert">
            {error}
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Verification code
          </label>
          <input
            autoComplete="one-time-code"
            className={`${employeeInputClass} tracking-[0.3em] text-center font-semibold`}
            inputMode="numeric"
            maxLength={6}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            type="text"
            value={otp}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <button
            className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-0 cursor-pointer p-0"
            disabled={cooldown > 0 || resending}
            onClick={() => void handleResend()}
            type="button"
          >
            {cooldown > 0
              ? `Resend code in ${cooldown}s`
              : resending
                ? "Sending…"
                : "Resend code"}
          </button>
          <div className="flex items-center gap-3 justify-end">
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`${employeeBtnClass} disabled:opacity-60 disabled:cursor-not-allowed`}
              disabled={verifying}
              type="submit"
            >
              {verifying ? "Verifying…" : "Verify"}
            </button>
          </div>
        </div>
      </form>
    </EmployeeModalShell>
  );
}
