import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logoutAction, toggleLanguageAction } from "@/lib/actions/auth";
import { t } from "@/lib/i18n";
import type { Module } from "@/lib/types";

const NAV_ITEMS: Array<{
  href: string;
  key: "nav.dashboard" | "nav.batches" | "nav.purchases" | "nav.sales" | "nav.medical";
  icon: string;
  module?: Module;
}> = [
  { href: "/dashboard", key: "nav.dashboard", icon: "📊" },
  { href: "/batches", key: "nav.batches", icon: "🐾", module: "batches" },
  { href: "/purchases", key: "nav.purchases", icon: "🛒", module: "purchases" },
  { href: "/sales", key: "nav.sales", icon: "💰", module: "sales" },
  { href: "/medical", key: "nav.medical", icon: "💉", module: "medical" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const lang = user.language;
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.module || hasPermission(user, item.module, "view")
  );

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-border bg-surface md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="text-2xl">🌾</span>
          <span className="font-bold text-foreground">{t(lang, "app.name")}</span>
        </div>
        <nav className="flex flex-1 flex-row overflow-x-auto px-2 md:flex-col md:overflow-visible">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
            >
              <span>{item.icon}</span>
              <span>{t(lang, item.key)}</span>
            </Link>
          ))}
          {user.role === "owner" && (
            <Link
              href="/team"
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
            >
              <span>👥</span>
              <span>{t(lang, "nav.team")}</span>
            </Link>
          )}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted capitalize">
              {user.role}
            </p>
          </div>
          <form action={toggleLanguageAction}>
            <button type="submit" className="btn-secondary text-xs px-2 py-1">
              {lang === "bn" ? "EN" : "বাং"}
            </button>
          </form>
        </div>
        <form action={logoutAction} className="px-4 pb-4">
          <button type="submit" className="btn-secondary w-full text-xs">
            {t(lang, "nav.logout")}
          </button>
        </form>
      </aside>
      <main className="flex-1 bg-background px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
