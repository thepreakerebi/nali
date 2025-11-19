"use client";

import { usePathname } from "next/navigation";
import { useIntl } from "react-intl";
import { useState, useEffect, startTransition, useRef } from "react";
import { locales, localeCookieName, type Locale } from "@/i18n.config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { GlobeIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/stores/useAuthStore";

interface LanguageSwitcherProps {
  onLanguageChange?: (locale: Locale) => void | Promise<void>;
}

export default function LanguageSwitcher({
  onLanguageChange,
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const intl = useIntl();
  const { isAuthenticated } = useAuthStore();
  const updatePreferredLanguage = useMutation(
    api.functions.userProfile.mutations.updatePreferredLanguage
  );
  
  // Detect initial locale - default to "en" for SSR, will be updated on client
  const [currentLocale, setCurrentLocale] = useState<Locale>("en");
  const [isMounted, setIsMounted] = useState(false);
  const hasInitialized = useRef(false);

  // Detect locale on client mount (only once) to avoid hydration mismatches
  useEffect(() => {
    if (hasInitialized.current) return;
    
    const detectLocale = (): Locale => {
      // First, check cookie (most reliable after reload)
      if (typeof document !== "undefined") {
        const cookies = document.cookie.split(";");
        const localeCookie = cookies.find((c) =>
          c.trim().startsWith(`${localeCookieName}=`)
        );
        if (localeCookie) {
          const locale = localeCookie.split("=")[1]?.trim() as Locale;
          if (locales.includes(locale)) {
            return locale;
          }
        }
      }
      
      // Then check pathname
      if (pathname) {
        const segments = pathname.split("/").filter(Boolean);
        if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
          return segments[0] as Locale;
        }
      }
      
      // Finally, check IntlProvider locale
      if (intl.locale) {
        const intlLocale = intl.locale.split("-")[0] as Locale;
        if (locales.includes(intlLocale)) {
          return intlLocale;
        }
      }
      
      return "en";
    };
    
    // Mark as mounted and set locale in a single transition
    startTransition(() => {
      setIsMounted(true);
      const detected = detectLocale();
      setCurrentLocale(detected);
      hasInitialized.current = true;
    });
  }, [pathname, intl.locale]);

  // Sync locale with IntlProvider locale when it changes (after initialization)
  // Only sync if IntlProvider locale differs and we haven't just set it from cookie
  useEffect(() => {
    if (!isMounted || !hasInitialized.current) return;
    
    if (intl.locale) {
      const intlLocale = intl.locale.split("-")[0] as Locale;
      // Check cookie first to ensure we respect user's choice
      let cookieLocale: Locale | null = null;
    if (typeof document !== "undefined") {
        const cookies = document.cookie.split(";");
        const localeCookie = cookies.find((c) =>
          c.trim().startsWith(`${localeCookieName}=`)
        );
        if (localeCookie) {
          const locale = localeCookie.split("=")[1]?.trim() as Locale;
          if (locales.includes(locale)) {
            cookieLocale = locale;
          }
        }
      }
      
      // Prefer cookie locale over IntlProvider if they differ
      const targetLocale = cookieLocale || intlLocale;
      if (locales.includes(targetLocale) && targetLocale !== currentLocale) {
        startTransition(() => {
          setCurrentLocale(targetLocale);
        });
      }
    }
  }, [isMounted, intl.locale, currentLocale]);

  const handleLanguageChange = async (locale: Locale) => {
    // Don't do anything if it's the same locale
    if (locale === currentLocale) return;

    // Set cookie synchronously first (critical for reload to work)
    // Use Function constructor to bypass React's static analysis restriction
    if (typeof window !== "undefined") {
      const cookieValue = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
      // Use Function constructor to bypass React's static analysis restriction
      new Function("cookie", "document.cookie = cookie")(cookieValue);
    }
    
    // Update local state immediately for better UX
    setCurrentLocale(locale);

    // If user is authenticated, update their preference in backend
    if (isAuthenticated && updatePreferredLanguage) {
      try {
        await updatePreferredLanguage({ preferredLanguage: locale });
      } catch (error) {
        console.error("Failed to update language preference:", error);
        // Continue with language change even if backend update fails
      }
    }

    // Call optional action callback
    if (onLanguageChange) {
      try {
        await onLanguageChange(locale);
      } catch (error) {
        console.error("Error in onLanguageChange callback:", error);
      }
    }

    // Since we're not using [lang] routing, reload the page to apply new locale
    // The server will read the cookie and load the correct translations
    window.location.reload();
  };

  const getLanguageLabel = (locale: Locale): string => {
    const labels: Record<Locale, string> = {
      en: "English",
      fr: "Français",
      rw: "Ikinyarwanda",
    };
    return labels[locale];
  };

  // Always render the same structure to avoid hydration mismatches
  // The DropdownMenu will work correctly even before mount
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Change language"
          disabled={!isMounted}
        >
          <GlobeIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLanguageChange(locale)}
            className={currentLocale === locale ? "bg-accent" : ""}
          >
            {getLanguageLabel(locale)}
            {currentLocale === locale && (
              <span className="ml-auto text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

