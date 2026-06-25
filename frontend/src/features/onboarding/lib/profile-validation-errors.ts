type ValidationIssue = {
  path?: unknown;
  message?: unknown;
};

function toIssuePath(path: unknown): (string | number)[] {
  if (!Array.isArray(path)) return [];
  return path.filter(
    (item): item is string | number =>
      typeof item === "string" || typeof item === "number",
  );
}

/** Map API profile validation issues to onboarding form field keys. */
export function mapProfileApiIssuesToFieldErrors(
  issues: ValidationIssue[],
): Record<string, string> {
  const next: Record<string, string> = {};

  for (const issue of issues) {
    if (typeof issue?.message !== "string") continue;
    const key = apiIssuePathToFormFieldKey(toIssuePath(issue.path));
    if (!key) continue;
    if (!next[key]) next[key] = issue.message;
  }

  return next;
}

export function firstProfileApiValidationMessage(
  issues: unknown,
): string | null {
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const first = issues[0] as ValidationIssue;
  return typeof first?.message === "string" ? first.message : null;
}

function apiIssuePathToFormFieldKey(path: (string | number)[]): string | null {
  if (path.length === 0) return null;

  if (path[0] === "personal" && typeof path[1] === "string") {
    const personalFieldMap: Record<string, string> = {
      currentAddress: "currentAddress",
      permanentAddress: "permanentAddress",
      emergencyContactName: "emergencyContactName",
      emergencyContactPhone: "emergencyContactPhone",
      maritalStatus: "maritalStatus",
      spouseName: "spouseName",
      fatherName: "fatherName",
      motherName: "motherName",
      bloodGroup: "bloodGroup",
      nationality: "nationality",
    };
    return personalFieldMap[path[1]] ?? null;
  }

  if (path[0] === "identity" && typeof path[1] === "string") {
    const identityFieldMap: Record<string, string> = {
      panNumber: "panNo",
      aadhaarNumber: "aadhaarNo",
      uanNumber: "uanNo",
      esicNumber: "esicNo",
    };
    return identityFieldMap[path[1]] ?? null;
  }

  if (
    path[0] === "academic" &&
    typeof path[1] === "number" &&
    typeof path[2] === "string"
  ) {
    return `academic.${path[1]}.${path[2]}`;
  }

  if (
    path[0] === "professional" &&
    typeof path[1] === "number" &&
    typeof path[2] === "string"
  ) {
    return `professional.${path[1]}.${path[2]}`;
  }

  if (typeof path[0] === "string") {
    return path[0];
  }

  return null;
}
