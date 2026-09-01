"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import RegisterForm from "@/components/forms/RegisterForm";
import { t } from "@/lib/i18n";
import type { Language } from "@/lib/types";

// useSearchParams() must sit below a Suspense boundary or `next build` fails
// to prerender the route -- isolate it in its own child so the language
// toggle above doesn't need to wait on it.
function RegisterFormWithPrefill({ lang }: { lang: Language }) {
  const searchParams = useSearchParams();
  const identifier = searchParams.get("identifier") ?? "";
  const isEmail = identifier.includes("@");
  return (
    <RegisterForm
      lang={lang}
      defaultEmail={identifier && isEmail ? identifier : undefined}
      defaultPhone={identifier && !isEmail ? identifier : undefined}
    />
  );
}

export default function RegisterPage() {
  const [lang, setLang] = useState<Language>("bn");

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌾</span>
            <span className="text-lg font-bold text-foreground">
              {t(lang, "login.subtitle")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="btn-secondary text-xs px-2 py-1"
          >
            {lang === "bn" ? "English" : "বাংলা"}
          </button>
        </div>

        <h1 className="mb-4 text-xl font-bold text-foreground">
          {t(lang, "register.title")}
        </h1>
        <Suspense fallback={<RegisterForm lang={lang} />}>
          <RegisterFormWithPrefill lang={lang} />
        </Suspense>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            {t(lang, "register.loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
