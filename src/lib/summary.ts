import { monthKey, shiftMonth } from "./dates";
import { splitInstallments } from "./money";
import type { Card, Category, EntryView, Expense, Installment, PaymentMethod } from "./types";
import { createId } from "./storage";

const INVOICE_PAYMENT_PATTERNS = [
  "pagamento fatura",
  "pagamento de fatura",
  "pgto fatura",
  "fatura cartao",
  "cartao de credito",
  "credit card payment",
  "payment invoice",
];

export interface ExpenseInput {
  description: string;
  total_amount: number;
  expense_date: string;
  payment_method: PaymentMethod;
  card_id: string | null;
  category_id: string;
  installment_count: number;
  notes: string | null;
}

/** Gera parcelas de um gasto, uma por mes de competencia. */
export function buildInstallments(expense: Expense, card: Card | null = null): Installment[] {
  const count = expense.payment_method === "credit" ? Math.max(1, expense.installment_count) : 1;
  const amounts = splitInstallments(expense.total_amount, count);
  const firstMonth = firstCompetenceMonth(expense, card);
  const timestamp = new Date().toISOString();

  return amounts.map((amount, index) => ({
    id: createId(),
    expense_id: expense.id,
    installment_number: index + 1,
    installment_count: count,
    amount,
    competence_month: shiftMonth(firstMonth, index),
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

function firstCompetenceMonth(expense: Expense, card: Card | null): string {
  const expenseMonth = monthKey(expense.expense_date);
  if (expense.payment_method !== "credit") return expenseMonth;
  if (!card?.closing_day || !card.due_day) return expenseMonth;

  const expenseDay = Number(expense.expense_date.slice(8, 10));
  if (!Number.isFinite(expenseDay)) return expenseMonth;

  const statementMonth =
    expenseDay <= card.closing_day ? expenseMonth : shiftMonth(expenseMonth, 1);

  return card.due_day > card.closing_day ? statementMonth : shiftMonth(statementMonth, 1);
}

export function normalizeExpenseInput(input: ExpenseInput): ExpenseInput {
  const isCredit = input.payment_method === "credit";
  const needsCard = input.payment_method === "credit" || input.payment_method === "debit";
  return {
    ...input,
    card_id: needsCard ? input.card_id : null,
    installment_count: isCredit ? Math.max(1, input.installment_count) : 1,
    notes: input.notes?.trim() ? input.notes.trim() : null,
  };
}

/** Junta parcelas, gasto, cartao e categoria de um mes. */
export function entriesForMonth(
  month: string,
  expenses: Expense[],
  installments: Installment[],
  cards: Card[],
  categories: Category[],
): EntryView[] {
  const expenseById = new Map(expenses.map((expense) => [expense.id, expense]));
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return installments
    .filter((installment) => installment.competence_month === month)
    .flatMap((installment) => {
      const expense = expenseById.get(installment.expense_id);
      if (!expense) return [];
      return [
        {
          installment,
          expense,
          card: expense.card_id ? (cardById.get(expense.card_id) ?? null) : null,
          category: categoryById.get(expense.category_id) ?? null,
        },
      ];
    });
}

export function sumEntries(entries: EntryView[]): number {
  return entries.reduce(
    (total, entry) => total + (shouldCountInExpenseTotals(entry) ? entry.installment.amount : 0),
    0,
  );
}

export function totalsByPaymentMethod(entries: EntryView[]): Record<PaymentMethod, number> {
  const totals: Record<PaymentMethod, number> = {
    credit: 0,
    debit: 0,
    pix: 0,
    cash: 0,
    other: 0,
  };
  for (const entry of entries) {
    if (!shouldCountInExpenseTotals(entry)) continue;
    totals[entry.expense.payment_method] += entry.installment.amount;
  }
  return totals;
}

export interface GroupTotal {
  id: string;
  label: string;
  color: string;
  total: number;
}

export function totalsByCategory(entries: EntryView[]): GroupTotal[] {
  const map = new Map<string, GroupTotal>();
  for (const entry of entries) {
    if (!shouldCountInExpenseTotals(entry)) continue;
    const id = entry.category?.id ?? "sem-categoria";
    const existing = map.get(id);
    const amount = entry.installment.amount;
    if (existing) {
      existing.total += amount;
    } else {
      map.set(id, {
        id,
        label: entry.category?.name ?? "Sem categoria",
        color: entry.category?.color ?? "#64748b",
        total: amount,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function totalsByCard(entries: EntryView[]): GroupTotal[] {
  const map = new Map<string, GroupTotal>();
  for (const entry of entries) {
    if (!shouldCountInCardTotals(entry)) continue;
    const existing = map.get(entry.card.id);
    if (existing) {
      existing.total += entry.installment.amount;
    } else {
      map.set(entry.card.id, {
        id: entry.card.id,
        label: entry.card.name,
        color: entry.card.color,
        total: entry.installment.amount,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function shouldCountInExpenseTotals(entry: EntryView): boolean {
  return !looksLikeInvoicePayment(entry);
}

function shouldCountInCardTotals(entry: EntryView): entry is EntryView & { card: Card } {
  if (!entry.card) return false;
  if (looksLikeInvoicePayment(entry)) return false;

  if (entry.expense.payment_method === "credit") return true;

  if (entry.expense.payment_method === "debit") {
    return true;
  }

  return false;
}

function looksLikeInvoicePayment(entry: EntryView): boolean {
  const text = `${entry.expense.description} ${entry.category?.name ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return INVOICE_PAYMENT_PATTERNS.some((pattern) => text.includes(pattern));
}

export function cardMonthTotal(cardId: string, entries: EntryView[], onlyCredit = false): number {
  return entries
    .filter(
      (entry) =>
        entry.expense.card_id === cardId &&
        shouldCountInCardTotals(entry) &&
        (!onlyCredit || entry.expense.payment_method === "credit"),
    )
    .reduce((total, entry) => total + entry.installment.amount, 0);
}
