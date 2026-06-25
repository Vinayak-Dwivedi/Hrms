import { listRequiredSubmitDocumentTypes } from "@/modules/onboarding/required-documents";

export function getHrRequiredVerifiedDocuments(
  academic: Array<{ qualification: string }>,
) {
  return listRequiredSubmitDocumentTypes(academic);
}
