import Image from "next/image";
import { EmployeeLoginForm } from "@/features/auth/components/employee-login-form";

export default function EmployeeLoginPage() {
  // Session-based redirect is now handled client-side after a successful
  // sign-in (see EmployeeLoginForm). The Express API issues cookies; we
  // don't read them in a server component anymore.
  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: "100vh" }}>

      {/* Left: dark panel */}
      <div
        className="flex flex-col items-center justify-center px-10 py-16 md:w-1/2"
        style={{ background: "#12162a" }}
      >
        <div className="flex flex-col items-center mb-10">
          <Image src="/logo.webp" alt="iLeads" width={180} height={72} style={{ objectFit: "contain" }} />
        </div>
        <div className="text-center max-w-lg">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", marginBottom: 10, lineHeight: 1.3 }}>
            Human Resource Management System
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
            Streamline your workforce management
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            Manage employees, attendance, payroll, and more in one place
          </p>
        </div>
      </div>

      {/* Right: form panel */}
      <div
        className="flex flex-col items-center justify-center px-10 py-16 md:w-1/2"
        style={{ background: "#f5f6fa" }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <h2 style={{ fontSize: 28, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>
            Employee Login
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
            Sign in to access your dashboard
          </p>
          <EmployeeLoginForm />
        </div>
      </div>

    </div>
  );
}
