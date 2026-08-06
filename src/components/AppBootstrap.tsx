import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

/** Carrega os dados locais e aplica o tema. Deve rodar uma vez, no root. */
export function AppBootstrap() {
  const hydrate = useAppStore((state) => state.hydrate);
  const hydrated = useAppStore((state) => state.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    document.documentElement.classList.add("dark");
  }, [hydrated]);

  return null;
}
