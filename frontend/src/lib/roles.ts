// Single source of truth for the role union, shared by AppShell and
// RoleDashboard. To introduce a new role, add it here and then handle it in:
//   - lib/role-config.ts                 (nav, dashboard modules, quick links)
//   - lib/resolve-ui-role.ts             (auth → UI role resolution)
//   - components/dashboard/RoleDashboard.tsx (role-specific data + sections)
//   - app/<role>/layout.tsx              (mount the shell with the new role)
export type Role = "employee" | "manager" | "hr" | "admin";
