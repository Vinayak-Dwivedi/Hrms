export const ORG_HIERARCHY_STATUS = ["Active", "Inactive"] as const;
export type OrgHierarchyStatus = (typeof ORG_HIERARCHY_STATUS)[number];

export const DEFAULT_LIST_LIMIT = 500;
