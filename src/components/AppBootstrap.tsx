import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { bootstrapRemoteDatabase } from "@/lib/sync";

/** Carrega os dados locais e aplica o tema. Deve rodar uma vez, no root. */
export function AppBootstrap() {
  const hydrate = useAppStore((state) => state.hydrate);
  const hydrated = useAppStore((state) => state.hydrated);
  const replaceAll = useAppStore((state) => state.replaceAll);
  const settings = useAppStore((state) => state.settings);
  const cards = useAppStore((state) => state.cards);
  const categories = useAppStore((state) => state.categories);
  const expenses = useAppStore((state) => state.expenses);
  const installments = useAppStore((state) => state.installments);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    void bootstrapRemoteDatabase({ cards, categories, expenses, installments, settings }).then(
      (db) => {
        if (db) replaceAll(db);
      },
    );
  }, [cards, categories, expenses, hydrated, installments, replaceAll, settings]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    document.documentElement.classList.add("dark");
  }, [hydrated]);

  return null;
}
