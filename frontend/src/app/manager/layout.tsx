import AppShell from "@/components/app/AppShell";

// Manager routes share the same shell as employee routes — same look,
// just a different nav (PERSONAL + MY TEAM sections) driven by the role.
export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell role="manager">{children}</AppShell>;
}
