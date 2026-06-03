import { BookOpen } from "lucide-react";
import ComingSoonPanel from "@/components/employee/ComingSoonPanel";

export default function LnDPage() {
  return (
    <ComingSoonPanel
      icon={BookOpen}
      title="L&D Portal"
      description="Learning + development courses, mandatory trainings, and certifications tracked against your role."
      details={[
        "Role-based learning paths and mandatory compliance trainings",
        "Course catalogue with self-enrolment",
        "Progress tracking and certificates of completion",
        "Manager-assigned trainings with due dates",
      ]}
    />
  );
}
