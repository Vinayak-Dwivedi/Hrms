"use client";

import { Building2, LayoutDashboard, ShieldCheck } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { SidebarIconName, SidebarWorkspace } from "./nav-config";

const icons: Record<SidebarIconName, typeof LayoutDashboard> = {
  building: Building2,
  dashboard: LayoutDashboard,
  root: ShieldCheck,
};

export function TeamSwitcher({ workspace }: { workspace: SidebarWorkspace }) {
  const WorkspaceIcon = icons[workspace.icon];

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <WorkspaceIcon className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{workspace.name}</span>
            <span className="truncate text-xs">{workspace.label}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
