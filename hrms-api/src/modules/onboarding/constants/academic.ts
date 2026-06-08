export const QUAL_CLASS_10 = "Class 10 (Matriculation)" as const;
export const QUAL_CLASS_12 = "Class 12 (HSC / Intermediate)" as const;
export const QUAL_GRADUATION = "Graduation" as const;
export const QUAL_POST_GRADUATION = "Post Graduation" as const;
export const QUAL_OTHER = "Other" as const;

export const ACADEMIC_QUALIFICATIONS = [
  QUAL_CLASS_10,
  QUAL_CLASS_12,
  QUAL_GRADUATION,
  QUAL_POST_GRADUATION,
  QUAL_OTHER,
] as const;

export const MAX_ACADEMIC_RECORDS = 10;

export function isKnownAcademicQualification(value: string): boolean {
  return (ACADEMIC_QUALIFICATIONS as readonly string[]).includes(value);
}
