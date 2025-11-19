"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "./sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const NO_SIDEBAR_PATHS = ["/signin", "/onboarding"];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldShowSidebar = !NO_SIDEBAR_PATHS.includes(pathname);

  // Get page title based on pathname
  const getPageTitle = () => {
    switch (pathname) {
      case "/":
        return "Home";
      case "/lesson-plans":
        return "Lesson Plans";
      case "/lesson-plans/new":
        return "Create Lesson Plan";
      case "/lesson-notes":
        return "Lesson Notes";
      case "/lesson-notes/new":
        return "Create Lesson Note";
      default:
        if (pathname.startsWith("/lesson-plans/")) {
          return "Lesson Plan";
        }
        if (pathname.startsWith("/lesson-notes/")) {
          return "Lesson Note";
        }
        return "Dashboard";
    }
  };

  if (!shouldShowSidebar) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <section className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-auto">
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold text-foreground">{getPageTitle()}</h1>
          </header>
          <main className="flex-1 p-4">{children}</main>
        </SidebarInset>
      </section>
    </SidebarProvider>
  );
}

