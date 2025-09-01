
"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Home, NotebookPen, Settings, UserCircle, LogIn, UserPlus, LogOut } from "lucide-react";
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
import { useAuth } from "@/context/auth-context";
import { auth } from "@/lib/firebase";

export function MainSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { user } = useAuth();

  const handleLogout = async () => {
    await auth.signOut();
  }

  return (
    <Sidebar collapsible={state === "collapsed" ? "icon" : "offcanvas"}>
      <SidebarHeader>
        <div className="flex items-center justify-between p-2">
           <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <NotebookPen className="h-7 w-7 text-primary" />
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
         {user ? (
          <>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/settings'} tooltip="Settings" size="lg">
                <Link href="/settings">
                  <Settings />
                  <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/profile'} tooltip="Profile" size="lg">
                <Link href="/profile">
                  <Avatar className="size-7">
                    <AvatarImage src={user.photoURL || "https://picsum.photos/100"} />
                    <AvatarFallback>{user.displayName?.[0].toUpperCase() || user.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="group-data-[collapsible=icon]:hidden">{user.displayName || user.email}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Logout" size="lg">
                  <LogOut />
                  <span className="group-data-[collapsible=icon]:hidden">Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </>
         ) : (
          <>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/login'} tooltip="Login" size="lg">
                <Link href="/login">
                  <LogIn />
                  <span className="group-data-[collapsible=icon]:hidden">Login</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/signup'} tooltip="Sign Up" size="lg">
                <Link href="/signup">
                  <UserPlus />
                  <span className="group-data-[collapsible=icon]:hidden">Sign Up</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </>
         )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
