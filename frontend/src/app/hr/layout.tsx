import HRShell from "@/components/hr/HRShell";

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HRShell>{children}</HRShell>;
}
