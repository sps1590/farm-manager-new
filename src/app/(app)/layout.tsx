import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logoutAction, toggleLanguageAction } from "@/lib/actions/auth";
import { t } from "@/lib/i18n";
import Sidebar, { type SidebarNavItem } from "@/components/Sidebar";
import type { Module } from "@/lib/types";

const NAV_ITEMS: Array<SidebarNavItem & { module?: Module }> = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: "dashboard" },
  { href: "/batches", labelKey: "nav.batches", icon: "batches", module: "batches" },
  { href: "/purchases", labelKey: "nav.purchases", icon: "purchases", module: "purchases" },
  { href: "/sales", labelKey: "nav.sales", icon: "sales", module: "sales" },
  { href: "/medical", labelKey: "nav.medical", icon: "medical", module: "medical" },
];

// Owner-only, not part of the configurable permission matrix -- financial
// and personal-compensation data, same reasoning as Team/Partners.
const OWNER_NAV_ITEMS: SidebarNavItem[] = [
  { href: "/team", labelKey: "nav.team", icon: "team" },
  { href: "/partners", labelKey: "nav.partners", icon: "partners" },
  { href: "/employees", labelKey: "nav.employees", icon: "employees" },
  { href: "/reports", labelKey: "nav.reports", icon: "reports" },
  { href: "/farm", labelKey: "nav.farmProfile", icon: "farmProfile" },
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
      <Sidebar
        lang={lang}
        appName={t(lang, "app.name")}
        navItems={visibleNavItems}
        ownerNavItems={OWNER_NAV_ITEMS}
        showOwnerNav={user.role === "owner"}
        showPartnerLink={user.role !== "owner" && user.is_partner}
        userName={user.name}
        userRole={user.role}
        logoutAction={logoutAction}
        toggleLanguageAction={toggleLanguageAction}
      />
      <main className="flex-1 bg-background px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
