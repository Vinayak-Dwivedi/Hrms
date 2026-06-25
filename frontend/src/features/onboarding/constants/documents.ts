import {
  isClass10Qualification,
  isClass12Qualification,
} from "./academic";

export const CLASS_10_CERTIFICATE = "Class 10 Certificate" as const;
export const CLASS_12_CERTIFICATE = "Class 12 Certificate" as const;

export const MANDATORY_ONBOARDING_DOCUMENTS = [
  "Aadhaar Card",
  "PAN Card",
] as const;

export type MandatoryOnboardingDocument =
  (typeof MANDATORY_ONBOARDING_DOCUMENTS)[number];

/** @deprecated Use `listRequiredOnboardingDocuments` for qualification-aware requirements. */
export const REQUIRED_ONBOARDING_DOCUMENTS = MANDATORY_ONBOARDING_DOCUMENTS;

export type RequiredOnboardingDocument = MandatoryOnboardingDocument;

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
  "Resume",
] as const;

export type ProfessionalDocumentType =
  (typeof PROFESSIONAL_DOCUMENT_TYPES)[number];

export type QualificationLinkedDocument =
  | typeof CLASS_10_CERTIFICATE
  | typeof CLASS_12_CERTIFICATE;

export type OnboardingDocumentType =
  | MandatoryOnboardingDocument
  | QualificationLinkedDocument
  | EducationalDocumentType
  | ProfessionalDocumentType;

export type AcademicQualificationRef = {
  qualification: string;
};

export function listRequiredOnboardingDocuments(
  academic: AcademicQualificationRef[],
): OnboardingDocumentType[] {
  const required: OnboardingDocumentType[] = [...MANDATORY_ONBOARDING_DOCUMENTS];
  if (academic.some((row) => isClass10Qualification(row.qualification))) {
    required.push(CLASS_10_CERTIFICATE);
  }
  if (academic.some((row) => isClass12Qualification(row.qualification))) {
    required.push(CLASS_12_CERTIFICATE);
  }
  return required;
}

export function getOnboardingDocumentSections(
  academic: AcademicQualificationRef[],
) {
  const requiredTypes = listRequiredOnboardingDocuments(academic);
  return [
    {
      id: "required",
      title: "Required documents",
      description:
        "Mandatory identity documents plus certificates for qualifications listed in your academic details.",
      types: requiredTypes,
      required: true,
    },
    {
      id: "educational",
      title: "Additional educational documents",
      description: "",
      types: EDUCATIONAL_DOCUMENT_TYPES,
      required: false,
    },
    {
      id: "professional",
      title: "Professional documents",
      description: "",
      types: PROFESSIONAL_DOCUMENT_TYPES,
      required: false,
    },
  ] as const;
}

/** @deprecated Use `getOnboardingDocumentSections(academic)` */
export const ONBOARDING_DOCUMENT_SECTIONS = getOnboardingDocumentSections([
  { qualification: "Class 10" },
  { qualification: "Class 12" },
]);

type DocumentReadinessRow = {
  documentType: string;
  status?: "Pending" | "Uploaded" | "Verified" | "Rejected";
};

/** A document is ready when present and not rejected by HR. */
export function isOnboardingDocumentReady(
  doc: DocumentReadinessRow | undefined,
): boolean {
  return !!doc && doc.status !== "Rejected";
}

export function listPendingRequiredDocuments(
  documents: DocumentReadinessRow[],
  academic: AcademicQualificationRef[] = [],
): OnboardingDocumentType[] {
  return listRequiredOnboardingDocuments(academic).filter((type) => {
    const doc = documents.find((d) => d.documentType === type);
    return !isOnboardingDocumentReady(doc);
  });
}

export function hasRejectedOnboardingDocuments(
  documents: DocumentReadinessRow[],
): boolean {
  return documents.some((d) => d.status === "Rejected");
}
