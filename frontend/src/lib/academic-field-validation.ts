const ALPHA_ONLY_PATTERN = /^[A-Za-z\s]+$/;
const NUMERIC_GRADE_PATTERN = /^\d+(\.\d{1,2})?$/;

export const INSTITUTION_ALPHA_ONLY_MESSAGE =
  "School name must contain letters only.";
export const BOARD_ALPHA_ONLY_MESSAGE =
  "Board / University must contain letters only.";
export const GRADE_FORMAT_MESSAGE =
  "Enter a numeric grade: percentage (e.g. 85) or CGPA on a 10-point scale (e.g. 9.5).";

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

export function isValidNumericGrade(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;

  if (!NUMERIC_GRADE_PATTERN.test(trimmed)) return false;

  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) return false;
  if (num <= 10) return num >= 0.1;
  return num <= 100;
}

export function sanitizeAlphaOnlyInput(value: string): string {
  return value.replace(/[^A-Za-z\s]/g, "");
}

export function sanitizeNumericGradeInput(value: string): string {
  let result = "";
  let decimalUsed = false;
  let decimalDigits = 0;

  for (const char of value) {
    if (/\d/.test(char)) {
      if (decimalUsed) {
        if (decimalDigits >= 2) continue;
        decimalDigits++;
      }
      result += char;
      continue;
    }
    if (char === "." && !decimalUsed && result.length > 0) {
      result += char;
      decimalUsed = true;
    }
  }

  return result;
}
