"use client";

import Approvals from "@/components/manager/Approvals";
import CompOffApprovals from "@/features/comp-off/CompOffApprovals";
import WorkflowApprovals from "@/features/comp-off/WorkflowApprovals";

export default function ApprovalsPage() {
  return (
    <>
      <WorkflowApprovals />
      <CompOffApprovals />
      <Approvals />
    </>
  );
}
