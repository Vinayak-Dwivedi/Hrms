import {
  QUAL_CLASS_10,
  QUAL_CLASS_12,
} from "@/modules/onboarding/constants/academic";

export const CLASS_10_CERTIFICATE = "Class 10 Certificate" as const;
export const CLASS_12_CERTIFICATE = "Class 12 Certificate" as const;

export const MANDATORY_SUBMIT_DOCUMENT_TYPES = [
  "Aadhaar Card",
  "PAN Card",
] as const;

export type MandatorySubmitDocumentType =
  (typeof MANDATORY_SUBMIT_DOCUMENT_TYPES)[number];

export type QualificationLinkedDocumentType =
  | typeof CLASS_10_CERTIFICATE
  | typeof CLASS_12_CERTIFICATE;

export type RequiredSubmitDocumentType =
  | MandatorySubmitDocumentType
  | QualificationLinkedDocumentType;

export function isClass10Qualification(qualification: string): boolean {
  return qualification === QUAL_CLASS_10 || /^Class 10\b/.test(qualification);
}

export function isClass12Qualification(qualification: string): boolean {
  return qualification === QUAL_CLASS_12 || /^Class 12\b/.test(qualification);
}

export function listRequiredSubmitDocumentTypes(
  academic: Array<{ qualification: string }>,
): RequiredSubmitDocumentType[] {
  const types: RequiredSubmitDocumentType[] = [
    ...MANDATORY_SUBMIT_DOCUMENT_TYPES,
  ];
  if (academic.some((row) => isClass10Qualification(row.qualification))) {
    types.push(CLASS_10_CERTIFICATE);
  }
  if (academic.some((row) => isClass12Qualification(row.qualification))) {
    types.push(CLASS_12_CERTIFICATE);
  }
  return types;
}
