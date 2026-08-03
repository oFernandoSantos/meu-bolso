import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/** "2026-07" a partir de "2026-07-26" ou Date */
export function monthKey(value: string | Date): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "yyyy-MM");
}

export function monthKeyToDate(key: string): Date {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month ?? 1) - 1, 1);
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
  return format(parseISO(iso), "dd/MM/yyyy");
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
