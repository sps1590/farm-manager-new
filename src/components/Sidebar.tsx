"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  ShoppingCart,
  HandCoins,
  Syringe,
  Users,
  Handshake,
  UserCog,
  LineChart,
  Sprout,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import Logo from "@/components/Logo";
import { t, roleLabel, type DictKey } from "@/lib/i18n";
import type { Language } from "@/lib/types";

export type NavIconKey =
  | "dashboard"
  | "batches"
  | "purchases"
  | "sales"
  | "medical"
  | "team"
  | "partners"
  | "employees"
  | "reports"
  | "farmProfile";

const ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  batches: Layers,
  purchases: ShoppingCart,
  sales: HandCoins,
  medical: Syringe,
  team: Users,
  partners: Handshake,
  employees: UserCog,
  reports: LineChart,
  farmProfile: Sprout,
};

export interface SidebarNavItem {
  href: string;
  labelKey: DictKey;
  icon: NavIconKey;
}

function NavLink({ item, lang }: { item: SidebarNavItem; lang: Language }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = ICONS[item.icon];

  return (
    <Link
      href={item.href}
      className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-surface-hover"
      }`}
    >
      <Icon size={17} strokeWidth={active ? 2.4 : 2} />
      <span>{t(lang, item.labelKey)}</span>
    </Link>
  );
}

export default function Sidebar({
  lang,
  appName,
  navItems,
  ownerNavItems,
  showOwnerNav,
  showPartnerLink,
  userName,
  userRole,
  logoutAction,
  toggleLanguageAction,
}: {
  lang: Language;
  appName: string;
  navItems: SidebarNavItem[];
  ownerNavItems: SidebarNavItem[];
  showOwnerNav: boolean;
  showPartnerLink: boolean;
  userName: string;
  userRole: string;
  logoutAction: () => Promise<void>;
  toggleLanguageAction: () => Promise<void>;
}) {
  const initial = userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <aside className="flex shrink-0 flex-col border-b border-border bg-surface md:w-60 md:border-b-0 md:border-r">
      <div className="flex items-center px-4 py-4">
        <Logo withLabel label={appName} />
      </div>
      <nav className="flex flex-1 flex-row gap-1 overflow-x-auto px-2 md:flex-col md:overflow-visible">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} lang={lang} />
        ))}
        {showOwnerNav &&
          ownerNavItems.map((item) => (
            <NavLink key={item.href} item={item} lang={lang} />
          ))}
        {!showOwnerNav && showPartnerLink && (
          <NavLink
            item={{ href: "/partners", labelKey: "nav.partners", icon: "partners" }}
            lang={lang}
          />
        )}
      </nav>
      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {userName}
            </p>
            <p className="truncate text-xs text-muted">
              {roleLabel(userRole, lang)}
            </p>
          </div>
        </div>
        <form action={toggleLanguageAction}>
          <button type="submit" className="btn-secondary text-xs px-2 py-1">
            {lang === "bn" ? "EN" : "বাং"}
          </button>
        </form>
      </div>
      <form action={logoutAction} className="px-4 pb-4">
        <button
          type="submit"
          className="btn-secondary w-full text-xs"
        >
          <LogOut size={14} />
          {t(lang, "nav.logout")}
        </button>
      </form>
    </aside>
  );
}
