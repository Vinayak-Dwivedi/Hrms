"use client";

import { Briefcase, Check, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function EmailUnverifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-0.5 shrink-0 px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200"
      title="Not verified"
    >
      <span className="inline-flex items-center justify-center w-3 h-3 rounded-full border border-red-300 bg-white">
        <Check className="w-2 h-2 text-red-500" strokeWidth={3} aria-hidden />
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-wide leading-none text-red-600">
        Unverified
      </span>
    </span>
  );
}

export function EmailVerifiedBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200"
      title="Verified"
      aria-label="Verified"
    >
      <Check className="w-2.5 h-2.5 text-emerald-600" strokeWidth={3} aria-hidden />
    </span>
  );
}

const verifyLinkClass =
  "mt-1.5 text-[11px] font-semibold text-[#FF014F] hover:text-[#be185d] bg-transparent border-0 p-0 cursor-pointer inline-block";

const contactPillClass =
  "inline-flex items-center gap-1.5 self-start max-w-full px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-gray-200 text-gray-600 min-w-0";

const iconClass = "text-[#FF014F] shrink-0";

function emailIcon(variant: "personal" | "official") {
  if (variant === "official") {
    return <Briefcase size={11} className={iconClass} aria-hidden />;
  }
  return <Mail size={11} className={iconClass} aria-hidden />;
}

function emailTitle(variant: "personal" | "official") {
  return variant === "official" ? "Official email" : "Personal email";
}

export function EmployeeEmailRow({
  variant,
  email,
  isVerified,
  onVerify,
  verifyHref,
  className,
}: {
  variant: "personal" | "official";
  email: string | null | undefined;
  isVerified?: boolean;
  onVerify?: () => void;
  verifyHref?: string;
  className?: string;
}) {
  if (!email?.trim()) return null;

  return (
    <div className={cn("min-w-0", className ?? "mt-2")}>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={contactPillClass}
          title={`${emailTitle(variant)}: ${email}`}
        >
          {emailIcon(variant)}
          <span className="truncate text-xs font-medium text-gray-600">
            {email}
          </span>
        </span>
        {variant === "personal" && isVerified === true ? (
          <EmailVerifiedBadge />
        ) : variant === "personal" && isVerified === false ? (
          <EmailUnverifiedBadge />
        ) : null}
      </div>
      {variant === "personal" && isVerified !== undefined && isVerified === false && onVerify ? (
        <button className={verifyLinkClass} onClick={onVerify} type="button">
          Verify Email
        </button>
      ) : null}
      {variant === "personal" && isVerified !== undefined && isVerified === false && !onVerify && verifyHref ? (
        <Link className={verifyLinkClass} href={verifyHref}>
          Verify Email
        </Link>
      ) : null}
    </div>
  );
}

export function EmployeePhoneRow({
  phone,
  isVerified,
  onVerify,
  verifyHref,
  className,
}: {
  phone: string | null | undefined;
  isVerified?: boolean;
  onVerify?: () => void;
  verifyHref?: string;
  className?: string;
}) {
  if (!phone?.trim()) return null;

  return (
    <div className={cn("min-w-0", className ?? "mt-2")}>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={contactPillClass}
          title={`Mobile: ${phone}`}
        >
          <Phone size={11} className={iconClass} aria-hidden />
          <span className="truncate text-xs font-medium text-gray-600">
            {phone}
          </span>
        </span>
        {isVerified === true ? (
          <EmailVerifiedBadge />
        ) : isVerified === false ? (
          <EmailUnverifiedBadge />
        ) : null}
      </div>
      {isVerified !== undefined && isVerified === false && onVerify ? (
        <button className={verifyLinkClass} onClick={onVerify} type="button">
          Verify Mobile
        </button>
      ) : null}
      {isVerified !== undefined && isVerified === false && !onVerify && verifyHref ? (
        <Link className={verifyLinkClass} href={verifyHref}>
          Verify Mobile
        </Link>
      ) : null}
    </div>
  );
}

export function EmployeeEmailSummary({
  personalEmail,
  workEmail,
  fallbackEmail,
  personalEmailVerified,
  onVerifyPersonalEmail,
  verifyHref = "/profile",
  phone,
  phoneVerified,
  onVerifyPhone,
  phoneVerifyHref,
  className,
  rowClassName,
  showPersonalEmail = true,
  showVerification = true,
}: {
  personalEmail?: string | null;
  workEmail?: string | null;
  fallbackEmail?: string | null;
  personalEmailVerified?: boolean;
  onVerifyPersonalEmail?: () => void;
  verifyHref?: string;
  phone?: string | null;
  phoneVerified?: boolean;
  onVerifyPhone?: () => void;
  phoneVerifyHref?: string;
  className?: string;
  rowClassName?: string;
  showPersonalEmail?: boolean;
  showVerification?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {showPersonalEmail ? (
        <EmployeeEmailRow
          className={rowClassName}
          email={personalEmail}
          isVerified={showVerification ? (personalEmailVerified ?? false) : undefined}
          onVerify={onVerifyPersonalEmail}
          variant="personal"
          verifyHref={onVerifyPersonalEmail ? undefined : verifyHref}
        />
      ) : null}
      <EmployeeEmailRow
        className={rowClassName}
        email={workEmail ?? fallbackEmail}
        variant="official"
      />
      <EmployeePhoneRow
        className={rowClassName}
        isVerified={showVerification ? (phoneVerified ?? false) : undefined}
        onVerify={onVerifyPhone}
        phone={phone}
        verifyHref={onVerifyPhone ? undefined : phoneVerifyHref ?? verifyHref}
      />
    </div>
  );
}
