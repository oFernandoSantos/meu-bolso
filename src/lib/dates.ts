import { addMonths, addWeeks, addYears, format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function safeDate(value: string | Date): Date {
  const parsed = typeof value === "string" ? parseISO(value) : value;
  return isValid(parsed) ? parsed : new Date();
}

/** "2026-07" a partir de "2026-07-26" ou Date */
export function monthKey(value: string | Date): string {
  return format(safeDate(value), "yyyy-MM");
}

export function monthKeyToDate(key: string): Date {
  const [year, month] = key.split("-");
  const parsed = new Date(Number(year), Number(month ?? 1) - 1, 1);
  return isValid(parsed) ? parsed : new Date();
}

export function shiftMonth(key: string, amount: number): string {
  return monthKey(addMonths(monthKeyToDate(key), amount));
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

/** "julho de 2026" */
export function monthLabel(key: string): string {
  return format(monthKeyToDate(key), "MMMM 'de' yyyy", { locale: ptBR });
}

/** "julho" */
export function monthName(key: string): string {
  return format(monthKeyToDate(key), "MMMM", { locale: ptBR });
}

/** "26/07/2026" */
export function formatDateBR(iso: string): string {
  return format(safeDate(iso), "dd/MM/yyyy");
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function shiftDateISO(iso: string, mode: "week" | "month" | "year", amount: number): string {
  const date = safeDate(iso);
  const shifted =
    mode === "week"
      ? addWeeks(date, amount)
      : mode === "month"
        ? addMonths(date, amount)
        : addYears(date, amount);
  return format(shifted, "yyyy-MM-dd");
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
