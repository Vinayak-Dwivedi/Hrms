"use client";

import Approvals from "@/components/manager/Approvals";
import CompOffApprovals from "@/features/comp-off/CompOffApprovals";

export default function ApprovalsPage() {
  return (
    <>
      <CompOffApprovals />
      <Approvals />
    </>
  );
}
