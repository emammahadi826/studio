
"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Home, NotebookPen, Settings, UserCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function MainSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar collapsible={state === "collapsed" ? "icon" : "offcanvas"}>
      <SidebarHeader>
        <div className="flex items-center justify-between p-2">
           <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <NotebookPen className="w-7 h-7 text-primary" />
            <h1 className="text-lg font-semibold">CanvasNote</h1>
           </Link>
           <SidebarTrigger className="hidden md:flex" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Dashboard" size="lg">
                <Link href="/">
                  <Home />
                  <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                </Link>
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
       <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings" size="lg">
              <Link href="#">
                <Settings />
                <span className="group-data-[collapsible=icon]:hidden">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Profile" size="lg">
              <Link href="#">
                <Avatar className="size-7">
                  <AvatarImage src="https://picsum.photos/100" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <span className="group-data-[collapsible=icon]:hidden">Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
