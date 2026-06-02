import { FileText } from "lucide-react";
import ComingSoonPanel from "@/components/employee/ComingSoonPanel";

export default function MyRequestsPage() {
  return (
    <ComingSoonPanel
      icon={FileText}
      title="My Requests"
      description="A single place to track every request you've raised across the HRMS — not just leave."
      details={[
        "Leave requests with live approval status",
        "Attendance regularisation requests",
        "Resignation, transfer, and document requests",
        "Filter by status: Pending, Approved, Rejected, Cancelled",
      ]}
    />
  );
}
