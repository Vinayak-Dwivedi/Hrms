import { EmployeeLoginForm } from "@/features/auth/components/employee-login-form";import { AppLogo } from "@/components/app/AppLogo";

// The left-panel illustration is loaded from /public/login-illustration.png.
// Drop your asset there with the matching filename — the layout/sizing
// matches the mockup. PNG / JPG / WebP all work; if you change the
// extension, update the src below to match.
const ILLUSTRATION_SRC = "/login-illustration.png";
const LOGIN_BACKGROUND_SRC = "/login-banner.png"

export default function EmployeeLoginPage() {
  return (
    <div
      className="flex flex-col md:flex-row"
      style={{ minHeight: "100vh", background: "#fff" }}
    >
      {/* ── Left: illustration ─────────────────────────────────────────── */}
      <div
        className="hidden md:flex items-center justify-start"
        style={{
          flex: 1,
          padding: "32 px",
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
          src={LOGIN_BACKGROUND_SRC}
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
          <AppLogo priority width={120} />
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
              Sign in with your work email or employee ID
            </p>
            <EmployeeLoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
