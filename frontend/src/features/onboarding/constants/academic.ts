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

export type AcademicQualification = (typeof ACADEMIC_QUALIFICATIONS)[number];

export const FIXED_DEFAULT_QUALIFICATIONS = [QUAL_CLASS_10, QUAL_CLASS_12] as const;

/** Options shown when appending a row via + */
export const ADDABLE_ACADEMIC_OPTIONS = [
  QUAL_GRADUATION,
  QUAL_POST_GRADUATION,
  QUAL_OTHER,
] as const;

export const MAX_ACADEMIC_RECORDS = 10;

export function createEmptyAcademicRow(qualification = "") {
  return {
    qualification,
    qualificationOther: "",
    institution: "",
    boardUniversity: "",
    fieldOfStudy: "",
    gradeOrPercentage: "",
  };
}

export const DEFAULT_ACADEMIC_ROWS = [
  createEmptyAcademicRow(QUAL_CLASS_10),
  createEmptyAcademicRow(QUAL_CLASS_12),
];

export function isSchoolQualification(qualification: string): boolean {
  return qualification === QUAL_CLASS_10 || qualification === QUAL_CLASS_12;
}

export function isHigherEdQualification(qualification: string): boolean {
  return (
    qualification === QUAL_GRADUATION || qualification === QUAL_POST_GRADUATION
  );
}

export function isFixedDefaultQualification(qualification: string): boolean {
  return (
    qualification === QUAL_CLASS_10 || qualification === QUAL_CLASS_12
  );
}

/** Map API-stored qualification back to form select + Other text. */
export function academicQualificationFromApi(qualification: string): {
  qualification: string;
  qualificationOther?: string;
} {
  if (
    (ACADEMIC_QUALIFICATIONS as readonly string[]).includes(qualification)
  ) {
    return { qualification };
  }
  return { qualification: QUAL_OTHER, qualificationOther: qualification };
}

