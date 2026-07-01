import {

  CalendarPlus,

  Calendar as CalendarIcon,

  CheckSquare,

  Clock,


  History,

  Shield,

  UserPlus,

  Users,

} from "lucide-react";

import type { ComponentType } from "react";

import type { Role } from "@/lib/roles";
import { canSeeMyTeamSection } from "@/lib/nav-permissions";



/** MY TEAM is shown when the user has team/clearance permissions. */
const MY_TEAM_SECTION_TITLE = "MY TEAM";

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

      { icon: CalendarIcon, label: "Apply Leave", href: "/attendance?apply=1" },

    ];

  }

  if (role === "admin") {

    return [

      { icon: Users, label: "Employees", href: "/employees" },

      { icon: CheckSquare, label: "Approvals", href: approvalsHref() },

      { icon: Shield, label: "System Access Roles", href: "/user-roles" },

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

    if (hasPermission("leave.policy.manage") || hasPermission("admin.roles")) {

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

  ];

}



export type RoleNavSection = {

  title: string;

};



/** Filter nav sections by permissions (before per-entry permission filtering). */

export function navSectionsForRole<T extends RoleNavSection>(

  _role: Role,

  sections: T[],

  hasAnyPermission: (codes: string[]) => boolean,

): T[] {

  const showMyTeam = canSeeMyTeamSection(hasAnyPermission);

  return sections.filter(

    (s) => s.title !== MY_TEAM_SECTION_TITLE || showMyTeam,

  );

}


