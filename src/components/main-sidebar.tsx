
"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Home, NotebookPen } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";

export function MainSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar collapsible={state === "collapsed" ? "icon" : "offcanvas"}>
      <SidebarHeader>
        <div className="flex items-center justify-between p-2">
           <Link href="/" className="flex items-center gap-2">
            <NotebookPen className="w-6 h-6 text-primary group-data-[collapsible=icon]:hidden" />
            <h1 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">CanvasNote</h1>
           </Link>
           <SidebarTrigger className="hidden md:flex" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Dashboard">
                <Link href="/">
                  <Home />
                  <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                </Link>
              </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Add other global navigation items here if needed */}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
