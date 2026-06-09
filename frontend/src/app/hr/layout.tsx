import HRShell from "@/components/hr/HRShell";
import { AuthProvider, RouteGuard } from "@/lib/auth-context";

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <RouteGuard>
        <HRShell>{children}</HRShell>
      </RouteGuard>
    </AuthProvider>
  );
}
