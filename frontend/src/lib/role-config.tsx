import {

  CalendarPlus,

  Calendar as CalendarIcon,

  CheckSquare,

  Clock,

  GraduationCap,

  History,

  Shield,

  UserPlus,

  Users,

} from "lucide-react";

import type { ComponentType } from "react";

import type { Role } from "@/lib/roles";



/** Section titles gated by UI role before permission filtering. */

const ROLE_NAV_SECTIONS: Record<Role, string[] | "*"> = {

  employee: "*",

  manager: "*",

  hr: "*",

  admin: "*",

};



/** MY TEAM is manager-only; all other sections are visible to every role. */

const MANAGER_ONLY_SECTIONS = new Set(["MY TEAM"]);



function SlackIcon({

  size = 24,

  className,

}: {

  size?: number;

  className?: string;

}) {

  return (

    <svg

      width={size}

      height={size}

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth={1.8}

      strokeLinecap="round"

      strokeLinejoin="round"

      className={className}

    >

      <rect x="2.5" y="9" width="3" height="6" rx="1.5" />

      <rect x="9" y="2.5" width="6" height="3" rx="1.5" />

      <rect x="18.5" y="9" width="3" height="6" rx="1.5" />

      <rect x="9" y="18.5" width="6" height="3" rx="1.5" />

      <rect x="9" y="9" width="6" height="6" rx="1" />

    </svg>

  );

}



export type QuickLinkIcon = ComponentType<{

  size?: number;

  className?: string;

}>;



export type QuickLink = {

  icon: QuickLinkIcon;

  label: string;

  href: string;

  external?: boolean;

};



export type BottomTableKind = "own" | "team" | "admin" | "hr";



export type DashboardModules = {
  hrSection: boolean;
  personalWidgets: boolean;
  bottomTableKind: BottomTableKind;
};

export function dashboardModulesFor(

  role: Role,

  hasPermission: (code: string) => boolean,

): DashboardModules {

  const hrSection =

    role === "hr" &&

    (hasPermission("onboarding.view") || hasPermission("employees.view"));



  let bottomTableKind: BottomTableKind = "own";

  if (role === "manager") {

    bottomTableKind = "team";

  } else if (role === "admin") {

    bottomTableKind = "admin";

  } else if (role === "hr" && hasPermission("onboarding.view")) {

    bottomTableKind = "hr";

  }



  return {
    hrSection,
    personalWidgets: true,
    bottomTableKind,
  };
}



function approvalsHref(): string {

  return "/manager/approvals";

}



export function quickLinksFor(

  role: Role,

  hasPermission: (code: string) => boolean,

): QuickLink[] {

  if (role === "manager") {

    return [

      { icon: CheckSquare, label: "Approvals", href: approvalsHref() },

      { icon: History, label: "Punch History", href: "/attendance" },

      { icon: Users, label: "Company Directory", href: "/directory" },

      { icon: CalendarIcon, label: "Apply Leave", href: "/attendance?apply=1" },

    ];

  }

  if (role === "admin") {

    return [

      { icon: Users, label: "Employees", href: "/employees" },

      { icon: CheckSquare, label: "Approvals", href: approvalsHref() },

      { icon: Shield, label: "User Roles", href: "/user-roles" },

      { icon: CalendarIcon, label: "Leave Policy", href: "/leave-policy" },

    ];

  }

  if (role === "hr") {

    const links: QuickLink[] = [];

    if (hasPermission("employees.create")) {

      links.push({

        icon: UserPlus,

        label: "Add Employee",

        href: "/add-employee",

      });

    }

    if (hasPermission("employees.view")) {

      links.push({ icon: Users, label: "Employees", href: "/employees" });

    }

    if (hasPermission("attendance.view")) {

      links.push({ icon: Clock, label: "Attendance", href: "/attendance" });

    }

    if (hasPermission("admin.roles")) {

      links.push({

        icon: CalendarIcon,

        label: "Leave Policy",

        href: "/leave-policy",

      });

    }

    if (links.length > 0) return links;

    return [{ icon: Users, label: "Employees", href: "/employees" }];

  }

  return [

    { icon: CalendarPlus, label: "Apply Leave", href: "/attendance?apply=1" },

    {

      icon: SlackIcon,

      label: "Slack",

      href: "https://slack.com/signin#/signin",

      external: true,

    },

    { icon: History, label: "Punch History", href: "/attendance" },

    { icon: Users, label: "Company Directory", href: "/directory" },

    { icon: GraduationCap, label: "L&D Portal", href: "/lnd" },

  ];

}



export type RoleNavSection = {

  title: string;

};



/** Filter nav sections by resolved UI role (before permission filtering). */

export function navSectionsForRole<T extends RoleNavSection>(

  role: Role,

  sections: T[],

): T[] {

  const allowed = ROLE_NAV_SECTIONS[role];

  if (allowed === "*") {

    return sections.filter(

      (s) =>

        !MANAGER_ONLY_SECTIONS.has(s.title) || role === "manager",

    );

  }

  return sections.filter((s) => allowed.includes(s.title));

}


