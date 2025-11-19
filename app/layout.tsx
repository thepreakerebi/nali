import type { Metadata } from "next";
import { Rethink_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import IntlClientProvider from "@/components/IntlClientProvider";
import { Toaster } from "@/components/ui/sonner";
import { LayoutWrapper } from "@/app/_components/layoutWrapper";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getDictionary } from "@/lib/get-dictionary";
import { defaultLocale, localeCookieName, locales, type Locale } from "@/i18n.config";

const rethinkSans = Rethink_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Nali - AI Lesson Planner for Teachers",
  description: "Create comprehensive lesson plans and notes with AI assistance for teachers",
  icons: {
    icon: "/nali-favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get locale from cookie, default to English
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(localeCookieName);
  let locale: Locale = defaultLocale;
  
  // Validate locale from cookie
  if (localeCookie?.value) {
    const cookieValue = localeCookie.value as Locale;
    if (locales.includes(cookieValue)) {
      locale = cookieValue;
    }
  }
  
  const messages = await getDictionary(locale);

  return (
    <ConvexAuthNextjsServerProvider>
      <html lang={locale} suppressHydrationWarning={true}>
        <body className={`${rethinkSans.variable} antialiased`} suppressHydrationWarning={true}>
          <ConvexClientProvider>
            <IntlClientProvider locale={locale} messages={messages}>
              <SidebarProvider>
                <LayoutWrapper>{children}</LayoutWrapper>
              </SidebarProvider>
              <Toaster />
            </IntlClientProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
