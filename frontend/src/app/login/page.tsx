import Image from "next/image";
import { EmployeeLoginForm } from "@/features/auth/components/employee-login-form";

// The left-panel illustration is loaded from /public/login-illustration.png.
// Drop your asset there with the matching filename — the layout/sizing
// matches the mockup. PNG / JPG / WebP all work; if you change the
// extension, update the src below to match.
const ILLUSTRATION_SRC = "/login-illustration.png";

export default function EmployeeLoginPage() {
  return (
    <div
      className="flex flex-col md:flex-row"
      style={{ minHeight: "100vh", background: "#fff" }}
    >
      {/* ── Left: illustration ─────────────────────────────────────────── */}
      <div
        className="hidden md:flex items-center justify-center"
        style={{
          flex: 1,
          padding: "48px 32px",
        }}
      >
        {/*
          Plain <img> (not next/image) so a missing file just shows a broken
          asset icon during local dev rather than throwing a runtime error.
          Once /public/login-illustration.png exists, swap to next/image for
          optimization if you like.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ILLUSTRATION_SRC}
          alt="HRMS — Human Resource Management System"
          style={{
            width: "100%",
            maxWidth: 620,
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      {/* ── Right: form ────────────────────────────────────────────────── */}
      <div className="relative flex flex-col" style={{ flex: 1 }}>
        {/* Logo pinned top-right */}
        <div
          className="absolute top-0 right-0"
          style={{ padding: "28px 40px" }}
        >
          <Image
            src="/logo.webp"
            alt="iLeads"
            width={120}
            height={48}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center" style={{ paddingLeft: 80, paddingRight: 80 }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <h1
              className="text-[28px] font-bold"
              style={{ color: "#111827", marginBottom: 6 }}
            >
              Sign In
            </h1>
            <p
              className="text-[13px]"
              style={{ color: "#6b7280", marginBottom: 28 }}
            >
              Enter your credentials to access your account
            </p>
            <EmployeeLoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
