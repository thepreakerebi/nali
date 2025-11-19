"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ChevronRightIcon,
  SettingsIcon,
  HelpCircleIcon,
  LogOutIcon,
} from "lucide-react";
import {
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function UserDropdown() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const userProfile = useQuery(api.functions.userProfile.queries.getCurrentUserProfile);
  const { state } = useSidebar();

  // Get profile photo URL, ensuring it's a valid string or undefined
  const profilePhotoUrl = userProfile?.profilePhoto?.trim() || undefined;

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/signin");
      toast.success("Signed out successfully");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  if (userProfile === undefined) {
    return (
      <SidebarMenuButton
        className={cn(
          "w-full justify-start gap-2 !p-2 h-auto",
          state === "collapsed" && "!size-8 !p-2 justify-center"
        )}
        disabled
      >
        <Skeleton className="size-8 shrink-0 rounded-full" />
        {state === "expanded" && (
          <>
            <section className="flex flex-col gap-1 items-start flex-1 min-w-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </section>
            <Skeleton className="size-4 shrink-0 rounded" />
          </>
        )}
      </SidebarMenuButton>
    );
  }

  if (userProfile === null) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          className={cn(
            "w-full justify-start gap-2 !p-2 h-auto",
            state === "collapsed" && "!size-8 !p-2 justify-center"
          )}
          tooltip={
            state === "collapsed" && userProfile
              ? `${userProfile.name}${userProfile.schoolName ? ` - ${userProfile.schoolName}` : ""}`
              : undefined
          }
          suppressHydrationWarning
        >
          <Avatar className="size-8 shrink-0">
            <AvatarImage 
              src={profilePhotoUrl} 
              alt={`${userProfile.name}'s profile photo`}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="text-xs">
              {getInitials(userProfile.name)}
            </AvatarFallback>
          </Avatar>
          {state === "expanded" && (
            <>
              <section className="flex flex-col gap-1 items-start flex-1 min-w-0">
                <p className="text-sm font-medium truncate w-full">
                  {userProfile.name}
                </p>
                {userProfile.schoolName && (
                  <p className="text-xs text-muted-foreground truncate w-full">
                    {userProfile.schoolName}
                  </p>
                )}
              </section>
              <ChevronRightIcon className="size-4 shrink-0" />
            </>
          )}
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-48">
        <DropdownMenuItem>
          <SettingsIcon className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HelpCircleIcon className="size-4" />
          Help
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOutIcon className="size-4" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

