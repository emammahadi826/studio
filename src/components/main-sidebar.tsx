
"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Home, NotebookPen } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function MainSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between">
           <h1 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">CanvasNote</h1>
           <SidebarTrigger className="hidden md:flex" />
        </div>
      </SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Home">
              <Link href="/">
                <Home />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/canvas')} tooltip="Canvas">
              <Link href="/canvas">
                <NotebookPen />
                <span>Canvas</span>
              </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </Sidebar>
  );
}
