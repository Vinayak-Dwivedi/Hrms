import { redirect } from "next/navigation";

export default async function OnboardingTokenRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const trimmed = token?.trim();
  if (!trimmed) {
    redirect("/employee/onboarding");
  }
  redirect(`/employee/onboarding?token=${encodeURIComponent(trimmed)}`);
}
