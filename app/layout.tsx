import type { Metadata } from "next";
import { Rethink_Sans } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import IntlClientProvider from "@/components/IntlClientProvider";
import { getDictionary } from "@/lib/get-dictionary";

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
  // Default to English for now (will be updated when language routing is implemented)
  const messages = await getDictionary("en");

  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning={true}>
        <body className={`${rethinkSans.variable} antialiased`}>
          <ConvexClientProvider>
            <IntlClientProvider locale="en" messages={messages}>
              {children}
            </IntlClientProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
