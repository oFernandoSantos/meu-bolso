import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

/** Carrega os dados locais e aplica o tema. Deve rodar uma vez, no root. */
export function AppBootstrap() {
  const hydrate = useAppStore((state) => state.hydrate);
  const hydrated = useAppStore((state) => state.hydrated);
  const theme = useAppStore((state) => state.settings.theme);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && prefersDark.matches);
      root.classList.toggle("dark", dark);
    };

    apply();
    if (theme !== "system") return;
    prefersDark.addEventListener("change", apply);
    return () => prefersDark.removeEventListener("change", apply);
  }, [theme, hydrated]);

  return null;
}
