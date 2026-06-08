export const REQUIRED_SUBMIT_DOCUMENT_TYPES = [
  "PAN Card",
  "Aadhaar Card",
  "Resume",
] as const;

export const SUPPORTED_DOCUMENT_TYPES = [
  "Resume",
  "Academic Certificates",
  "Educational Certificates",
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
