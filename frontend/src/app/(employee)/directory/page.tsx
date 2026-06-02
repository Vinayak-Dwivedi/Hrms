import { Users } from "lucide-react";
import ComingSoonPanel from "@/components/employee/ComingSoonPanel";

export default function DirectoryPage() {
  return (
    <ComingSoonPanel
      icon={Users}
      title="Company Directory"
      description="A searchable directory of every employee — find a colleague by name, department, designation or branch."
      details={[
        "Search by name, employee ID, email or phone",
        "Filter by department, designation, branch and grade",
        "Org-chart view to see who reports to whom",
        "One-click email / call from the profile card",
      ]}
    />
  );
}
