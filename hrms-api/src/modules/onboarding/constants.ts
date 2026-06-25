export const REQUIRED_SUBMIT_DOCUMENT_TYPES = [
  "PAN Card",
  "Aadhaar Card",
] as const;

export {
  CLASS_10_CERTIFICATE,
  CLASS_12_CERTIFICATE,
  listRequiredSubmitDocumentTypes,
  MANDATORY_SUBMIT_DOCUMENT_TYPES,
} from "@/modules/onboarding/required-documents";

export const SUPPORTED_DOCUMENT_TYPES = [
  "Resume",
  "Academic Certificates",
  "Educational Certificates",
  "Class 10 Certificate",
  "Class 12 Certificate",
  "Resume",
  "Experience Letter",
  "Relieving Letter",
  "Salary Slip",
  "Pay Slip",
  "Offer Letter",
  "PAN Card",
  "Aadhaar Card",
  "Passport",
  "Profile Photo",
  "Appointment Letter",
] as const;

export type SupportedDocumentType = (typeof SUPPORTED_DOCUMENT_TYPES)[number];
