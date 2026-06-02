import { Receipt } from "lucide-react";
import ComingSoonPanel from "@/components/employee/ComingSoonPanel";

export default function PayslipsPage() {
  return (
    <ComingSoonPanel
      icon={Receipt}
      title="My Payslips"
      description="Monthly payslips with gross, deductions, net pay and YTD totals — downloadable as PDF."
      details={[
        "Per-month payslip with earnings + deduction breakdown",
        "Year-to-date and FY-to-date summaries",
        "PDF download with company letterhead",
        "Form 16 / tax statements at year end",
      ]}
    />
  );
}
