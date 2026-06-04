import { redirect } from "next/navigation";

// Org Setup has no landing view of its own — Location is the default.
export default function OrgSetupIndexPage() {
  redirect("/hr/org-setup/location");
}
