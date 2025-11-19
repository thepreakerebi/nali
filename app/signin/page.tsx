"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { useIntl } from "react-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const intl = useIntl();

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn("google");
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : intl.formatMessage({ id: "signin.error.generic" })
      );
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-white relative">
      {/* Teal Glow Background */}
      <section
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #14b8a6 100%)
          `,
          backgroundSize: "100% 100%",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <header className="text-center flex flex-col items-center gap-6 mb-12">
          <Image
            src="/nali-logo.svg"
            alt="Nali Logo"
            width={115}
            height={33}
            priority
          />
          <h1 className="text-4xl font-bold text-slate-900">
            {intl.formatMessage({ id: "signin.title" })}
        </h1>
          <p className="text-lg font-medium text-slate-700">
            {intl.formatMessage({ id: "signin.subtitle" })}
          </p>
          <p className="text-base text-slate-600 max-w-md">
            {intl.formatMessage({ id: "signin.description" })}
          </p>
        </header>

        <article className="w-full max-w-md">
          <Button
            type="button"
            size="lg"
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex flex-row items-center justify-center gap-3 bg-white/80 backdrop-blur-md hover:bg-white/90 text-slate-900 font-semibold shadow-lg hover:shadow-xl border border-white/50 rounded-full"
            aria-label={intl.formatMessage({ id: "signin.button" })}
          >
            {loading ? (
              <>
                <Spinner className="size-4" />
                {intl.formatMessage({ id: "signin.loading" })}
              </>
            ) : (
              <>
                <Image
                  src="/google.svg"
                  alt=""
                  width={14}
                  height={15}
                  aria-hidden="true"
                  className="shrink-0"
                />
                {intl.formatMessage({ id: "signin.button" })}
              </>
            )}
          </Button>

        {error && (
            <section
              className="mt-6 bg-rose-50 border border-rose-200 rounded-lg p-4"
              role="alert"
              aria-live="polite"
            >
              <p className="text-rose-800 font-medium text-sm wrap-break-word">
                <strong>{intl.formatMessage({ id: "signin.error" })}:</strong>{" "}
                {error}
              </p>
            </section>
          )}
        </article>
      </section>
    </main>
  );
}
