// Recipient types for leave-policy approval/notification configuration.
//
// These describe who a stage notifies (To/Cc/Bcc/Reply-To). The categories map
// to runtime concepts ("system": e.g. the reporting manager) and to real
// directory data ("users"/"roles"/"departments"/"locations") resolved at send
// time. Kept as a standalone type module so consumers don't pull in any picker
// UI or sample data.

export type RecipientCategory =
  | "system"
  | "users"
  | "roles"
  | "departments"
  | "locations"
  | "fields";

export type Recipient = {
  category: RecipientCategory;
  id: string; // unique key — e.g. "system:dept_head", "user:42", "field:employee_id"
  label: string; // shown in the chip
};
