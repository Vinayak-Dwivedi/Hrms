import { ApiError } from "@/middleware/error";
import * as invitationService from "@/modules/hr-onboarding/services/invitation.service";

/** @deprecated Use invitationService.issueOnboardingToken */
export async function assignOnboardingToken(params: {
  employeeId: number;
  workEmail: string;
  personalEmail: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  plainPassword: string;
  sendEmail?: boolean;
  issuedBy?: string;
}): Promise<{ expiresAt: Date }> {
  return invitationService.issueOnboardingToken({
    employeeId: params.employeeId,
    plainPassword: params.plainPassword,
    sendEmail: params.sendEmail,
    issuedBy: params.issuedBy,
    issueReason: "CREATE",
  });
}

/** @deprecated Use invitationService.resendInvitation */
export async function resendOnboardingInvitation(
  employeeId: number,
  issuedBy?: string,
): Promise<{ expiresAt: Date }> {
  return invitationService.resendInvitation({
    employeeId,
    issuedBy,
  });
}

export async function provisionOnboardingCredentials(params: {
  employeeId: number;
  userId: string;
  workEmail: string;
  personalEmail: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  sendEmail?: boolean;
  issuedBy?: string;
}): Promise<{ expiresAt: Date }> {
  if (!params.userId) {
    throw new ApiError(400, "MISSING_ACCOUNT", "User id required.");
  }
  return invitationService.resendInvitation({
    employeeId: params.employeeId,
    issuedBy: params.issuedBy,
  });
}
