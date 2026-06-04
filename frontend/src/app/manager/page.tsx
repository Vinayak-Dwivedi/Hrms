import { redirect } from "next/navigation";

// /manager has no content of its own — send users to the dashboard.
export default function ManagerIndexPage() {
  redirect("/manager/dashboard");
}
