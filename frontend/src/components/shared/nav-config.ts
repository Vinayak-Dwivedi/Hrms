export const sidebarIconNames = [
  "building",
  "dashboard",
  "root",
] as const;

export type SidebarIconName = (typeof sidebarIconNames)[number];

export type SidebarNavItem = {
  title: string;
  url: string;
  icon: SidebarIconName;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
};

export type SidebarNavSection = {
  label: string;
  items: SidebarNavItem[];
};

export type SidebarWorkspace = {
  name: string;
  label: string;
  icon: SidebarIconName;
};

export type SidebarUser = {
  name: string;
  email: string;
  avatar?: string | null;
};

export function buildRootNav(
  role: string | null | undefined,
): SidebarNavSection[] {
  if (role !== "super-admin") {
    return [];
  }

  return [
    {
      label: "Root",
      items: [
        {
          title: "Dashboard",
          url: "/root",
          icon: "dashboard",
          isActive: true,
        },
      ],
    },
  ];
}

export function buildTenantNav(
  tenantSlug: string,
  _role: string,
): SidebarNavSection[] {
  const baseUrl = `/t/${tenantSlug}`;

  return [
    {
      label: "Work",
      items: [
        {
          title: "Dashboard",
          url: baseUrl,
          icon: "dashboard",
        },
      ],
    },
  ];
}
