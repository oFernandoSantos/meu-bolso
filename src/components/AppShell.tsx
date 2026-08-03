import { Link, useRouterState } from "@tanstack/react-router";
import { CreditCard, Home, Receipt, Settings, Tags } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Início", icon: Home, exact: true },
  { to: "/gastos", label: "Gastos", icon: Receipt, exact: false },
  { to: "/cartoes", label: "Cartões", icon: CreditCard, exact: false },
  { to: "/categorias", label: "Categorias", icon: Tags, exact: false },
] as const;

export function TabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[30rem] -translate-x-1/2 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === "/" : pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface AppShellProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  withTabs?: boolean;
}

export function AppShell({ title, subtitle, action, children, withTabs = true }: AppShellProps) {
  return (
    <div className="app-shell relative pb-28">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-5 py-4 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          {withTabs ? (
            <Link
              to="/config"
              aria-label="Configurações"
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="size-5" />
            </Link>
          ) : null}
        </div>
      </header>
      <main className="px-5 py-5">{children}</main>
      {withTabs ? <TabBar /> : null}
    </div>
  );
}
