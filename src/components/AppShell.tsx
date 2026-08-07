import { Link, useRouterState } from "@tanstack/react-router";
import { CreditCard, Home, Receipt, Settings, Tags } from "lucide-react";
import type { ReactNode } from "react";
import logoLogin from "../../assets/logo-login.png";
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
                  "flex flex-col items-center gap-1 py-2 text-[0.7rem] font-medium transition-colors",
                  active ? "text-violet-400" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full border transition-colors",
                    active
                      ? "border-violet-500 bg-black text-violet-400"
                      : "border-transparent bg-transparent text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                </span>
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
  showBrandHeader?: boolean;
}

export function AppShell({
  title,
  subtitle,
  action,
  children,
  withTabs = true,
  showBrandHeader = false,
}: AppShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const normalizedTitle = title.toLowerCase();
  const isHomeHeader = normalizedTitle.includes("in");
  const showBrand = showBrandHeader || isHomeHeader || (withTabs && pathname === "/");
  const leftAction = withTabs ? null : action;
  const rightAction = withTabs ? (
    <Link
      to="/config"
      aria-label="Configurações"
      className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Settings className="size-4" />
    </Link>
  ) : null;

  return (
    <div className="app-shell relative pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 px-5 py-3 backdrop-blur">
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-3">
          <div className="flex h-9 items-center justify-center">
            {leftAction ?? <span className="block size-9" aria-hidden="true" />}
          </div>
          <div className="min-w-0 text-center">
            {showBrand ? (
              <img
                src={logoLogin}
                alt="Meu Bolso"
                className="mx-auto h-8 w-auto object-contain sm:h-9"
              />
            ) : (
              <>
                <h1 className="truncate text-[0.98rem] font-semibold leading-5">{title}</h1>
                {subtitle ? (
                  <p className="truncate pt-0.5 text-[0.68rem] text-muted-foreground">{subtitle}</p>
                ) : null}
              </>
            )}
          </div>
          <div className="flex h-9 items-center justify-center">
            {rightAction ?? <span className="block size-9" aria-hidden="true" />}
          </div>
        </div>
      </header>
      <main className="flex-1 px-5 py-5">{children}</main>
      {withTabs ? <TabBar /> : null}
    </div>
  );
}
