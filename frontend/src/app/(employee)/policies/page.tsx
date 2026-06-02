import { FileText } from "lucide-react";
import ComingSoonPanel from "@/components/employee/ComingSoonPanel";

export default function PoliciesPage() {
  return (
    <ComingSoonPanel
      icon={FileText}
      title="Company Policies"
      description="All HR policies, code of conduct, and standard operating procedures in one searchable place."
      details={[
        "Leave, attendance, travel and expense policies",
        "Code of conduct and POSH (Prevention of Sexual Harassment) policy",
        "Onboarding checklists and SOPs by department",
        "Acknowledgement tracking — sign-off on policy updates",
      ]}
    />
  );
}
