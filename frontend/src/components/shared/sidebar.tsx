"use client";

import type * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import type {
  SidebarNavSection,
  SidebarUser,
  SidebarWorkspace,
} from "./nav-config";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  sections: SidebarNavSection[];
  user: SidebarUser;
  workspace: SidebarWorkspace;
};

export function AppSidebar({
  sections,
  user,
  workspace,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher workspace={workspace} />
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section) => (
          <NavMain
            items={section.items}
            key={section.label}
            label={section.label}
          />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
