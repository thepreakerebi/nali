"use client";

import { IntlProvider } from "react-intl";

type Props = {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, string>;
};

export default function IntlClientProvider({
  children,
  locale,
  messages,
}: Props) {
  return (
    <IntlProvider messages={messages} locale={locale} defaultLocale="en">
      {children}
    </IntlProvider>
  );
}

