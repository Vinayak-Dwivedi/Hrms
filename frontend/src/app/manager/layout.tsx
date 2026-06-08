import AuthAppShell from "@/components/app/AuthAppShell";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthAppShell>{children}</AuthAppShell>;
}
