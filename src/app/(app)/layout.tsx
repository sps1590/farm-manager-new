import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { logoutAction, toggleLanguageAction } from "@/lib/actions/auth";
import { t } from "@/lib/i18n";

const NAV_ITEMS = [
  { href: "/dashboard", key: "nav.dashboard" as const, icon: "📊" },
  { href: "/batches", key: "nav.batches" as const, icon: "🐾" },
  { href: "/purchases", key: "nav.purchases" as const, icon: "🛒" },
  { href: "/sales", key: "nav.sales" as const, icon: "💰" },
  { href: "/medical", key: "nav.medical" as const, icon: "💉" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const lang = user.language;

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-border bg-surface md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="text-2xl">🌾</span>
          <span className="font-bold text-foreground">{t(lang, "app.name")}</span>
        </div>
        <nav className="flex flex-1 flex-row overflow-x-auto px-2 md:flex-col md:overflow-visible">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
            >
              <span>{item.icon}</span>
              <span>{t(lang, item.key)}</span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted">
              {user.role === "owner" ? "Owner" : "Employee"}
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
