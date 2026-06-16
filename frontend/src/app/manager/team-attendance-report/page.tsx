import { redirect } from "next/navigation";

export default function TeamAttendanceReportRedirect() {
  redirect("/attendance?scope=team");
}
