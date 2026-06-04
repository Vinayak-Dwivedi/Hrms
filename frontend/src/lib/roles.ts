// Single source of truth for the role union, shared by AppShell and
// RoleDashboard. To introduce a new role, add it here and then handle it in:
//   - components/app/AppShell.tsx        (sidebar nav for the role)
//   - components/dashboard/RoleDashboard.tsx
//       (data adapters, quick links, bottom table)
//   - app/<role>/layout.tsx              (mount the shell with the new role)
export type Role = "employee" | "manager" | "admin";
