const ALPHA_ONLY_PATTERN = /^[A-Za-z\s]+$/;
const GRADE_PATTERN = /^[A-Za-z0-9\s%]*$/;

export const INSTITUTION_ALPHA_ONLY_MESSAGE =
  "School name must contain letters only.";
export const BOARD_ALPHA_ONLY_MESSAGE =
  "Board / University must contain letters only.";
export const GRADE_FORMAT_MESSAGE =
  "Grade / % may contain letters, numbers, spaces, and at most one % sign.";

export function isAlphaOnlyInstitution(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return ALPHA_ONLY_PATTERN.test(trimmed);
}

export function isAlphaOnlyBoardUniversity(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return ALPHA_ONLY_PATTERN.test(trimmed);
}

export function isValidGradeOrPercentage(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const percentCount = (trimmed.match(/%/g) ?? []).length;
  if (percentCount > 1) return false;
  return GRADE_PATTERN.test(trimmed);
}
