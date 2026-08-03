import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { entriesForMonth } from "@/lib/summary";
import type { EntryView } from "@/lib/types";

/** Parcelas do mês de competência, já com gasto, cartão e categoria. */
export function useMonthEntries(month: string): EntryView[] {
  const expenses = useAppStore((state) => state.expenses);
  const installments = useAppStore((state) => state.installments);
  const cards = useAppStore((state) => state.cards);
  const categories = useAppStore((state) => state.categories);

  return useMemo(
    () => entriesForMonth(month, expenses, installments, cards, categories),
    [month, expenses, installments, cards, categories],
  );
}
