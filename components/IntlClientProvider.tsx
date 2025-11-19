"use client";

import { IntlProvider } from "react-intl";
import { useEffect } from "react";

type Props = {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, string>;
};

// Map locales to supported Intl locales
// Kinyarwanda (rw) may not be fully supported by all browsers, so we use a fallback
const getIntlLocale = (locale: string): string => {
  // Map rw to en for Intl formatting, but keep messages in Kinyarwanda
  if (locale === "rw") {
    return "en";
  }
  return locale;
};

export default function IntlClientProvider({
  children,
  locale,
  messages,
}: Props) {
  // Ensure locale is valid for Intl APIs
  const intlLocale = getIntlLocale(locale);

  useEffect(() => {
    // Set document locale for accessibility
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return (
    <IntlProvider
      messages={messages}
      locale={intlLocale}
      defaultLocale="en"
      onError={(err) => {
        // Suppress missing locale data warnings for rw
        if (
          err.code === "MISSING_DATA" &&
          err.message?.includes("locale")
        ) {
          return;
        }
        console.error("Intl error:", err);
      }}
    >
      {children}
    </IntlProvider>
  );
}

