export const REQUIRED_ONBOARDING_DOCUMENTS = [
  "Aadhaar Card",
  "PAN Card",
  "Resume",
] as const;

export type RequiredOnboardingDocument =
  (typeof REQUIRED_ONBOARDING_DOCUMENTS)[number];

export const EDUCATIONAL_DOCUMENT_TYPES = [
  "Educational Certificates",
  "Academic Certificates",
] as const;

export type EducationalDocumentType =
  (typeof EDUCATIONAL_DOCUMENT_TYPES)[number];

export const PROFESSIONAL_DOCUMENT_TYPES = [
  "Experience Letter",
  "Relieving Letter",
  "Offer Letter",
  "Appointment Letter",
  "Salary Slip",
] as const;

export type ProfessionalDocumentType =
  (typeof PROFESSIONAL_DOCUMENT_TYPES)[number];

export type OnboardingDocumentType =
  | RequiredOnboardingDocument
  | EducationalDocumentType
  | ProfessionalDocumentType;

export const ONBOARDING_DOCUMENT_SECTIONS = [
  {
    id: "required",
    title: "Required documents",
    description: "These documents are required to complete onboarding.",
    types: REQUIRED_ONBOARDING_DOCUMENTS,
    required: true,
  },
  {
    id: "educational",
    title: "Educational documents",
    description:
      "Upload degree certificates, mark sheets, or other academic records.",
    types: EDUCATIONAL_DOCUMENT_TYPES,
    required: false,
  },
  {
    id: "professional",
    title: "Professional documents",
    description:
      "Upload experience letters, relieving letters, offer letters, or pay slips.",
    types: PROFESSIONAL_DOCUMENT_TYPES,
    required: false,
  },
] as const;
