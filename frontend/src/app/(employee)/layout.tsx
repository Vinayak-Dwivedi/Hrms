import AuthAppShell from "@/components/app/AuthAppShell";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthAppShell>{children}</AuthAppShell>;
}
