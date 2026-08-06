import { describe, expect, it } from "vitest";
import {
  buildInstallments,
  cardMonthTotal,
  entriesForMonth,
  normalizeExpenseInput,
  sumEntries,
  totalsByCard,
  totalsByCategory,
  totalsByPaymentMethod,
} from "./summary";
import type { Card, Category, Expense, PaymentMethod } from "./types";

const now = "2026-07-01T00:00:00.000Z";

const cards: Card[] = [
  {
    id: "card-nubank",
    name: "Nubank",
    institution: "Nu",
    type: "both",
    credit_limit: 300000,
    closing_day: 20,
    due_day: 27,
    color: "#8b5cf6",
    active: true,
    created_at: now,
    updated_at: now,
  },
];

const categories: Category[] = [
  {
    id: "cat-mercado",
    name: "Mercado",
    icon: "shopping-cart",
    color: "#16a34a",
    active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "cat-compras",
    name: "Compras",
    icon: "shopping-bag",
    color: "#eab308",
    active: true,
    created_at: now,
    updated_at: now,
  },
];

function makeExpense(overrides: Partial<Expense> & { id: string }): Expense {
  return {
    description: "Gasto",
    total_amount: 10000,
    expense_date: "2026-07-26",
    payment_method: "pix" as PaymentMethod,
    card_id: null,
    category_id: "cat-mercado",
    installment_count: 1,
    notes: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

const mercado = makeExpense({
  id: "e1",
  description: "Mercado",
  total_amount: 23590,
  payment_method: "debit",
  card_id: "card-nubank",
});

const notebook = makeExpense({
  id: "e2",
  description: "Notebook",
  total_amount: 240000,
  payment_method: "credit",
  card_id: "card-nubank",
  category_id: "cat-compras",
  installment_count: 12,
});

const pix = makeExpense({ id: "e3", description: "Almoço", total_amount: 3000 });
const dinheiro = makeExpense({
  id: "e4",
  description: "Feira",
  total_amount: 5000,
  payment_method: "cash",
});

const expenses = [mercado, notebook, pix, dinheiro];
const installments = expenses.flatMap((expense) => buildInstallments(expense));

const entriesOf = (month: string) =>
  entriesForMonth(month, expenses, installments, cards, categories);

describe("parcelas", () => {
  it("cria uma parcela por mês no crédito", () => {
    const parcels = buildInstallments(notebook);
    expect(parcels).toHaveLength(12);
    expect(parcels[0]!.competence_month).toBe("2026-07");
    expect(parcels[5]!.competence_month).toBe("2026-12");
    expect(parcels[11]!.competence_month).toBe("2027-06");
    expect(parcels.reduce((sum, item) => sum + item.amount, 0)).toBe(240000);
  });

  it("não parcela débito, pix, dinheiro ou outro", () => {
    expect(buildInstallments(mercado)).toHaveLength(1);
    expect(normalizeExpenseInput({ ...pix, installment_count: 6 }).installment_count).toBe(1);
    expect(normalizeExpenseInput({ ...pix, card_id: "card-nubank" }).card_id).toBeNull();
  });
});

describe("totais mensais", () => {
  it("soma o total do mês", () => {
    expect(sumEntries(entriesOf("2026-07"))).toBe(23590 + 20000 + 3000 + 5000);
  });

  it("soma por forma de pagamento", () => {
    const totals = totalsByPaymentMethod(entriesOf("2026-07"));
    expect(totals.debit).toBe(23590);
    expect(totals.credit).toBe(20000);
    expect(totals.pix).toBe(3000);
    expect(totals.cash).toBe(5000);
    expect(totals.other).toBe(0);
  });

  it("soma por categoria", () => {
    const totals = totalsByCategory(entriesOf("2026-07"));
    expect(totals.find((item) => item.label === "Mercado")!.total).toBe(23590 + 3000 + 5000);
    expect(totals.find((item) => item.label === "Compras")!.total).toBe(20000);
  });

  it("soma por cartão", () => {
    const totals = totalsByCard(entriesOf("2026-07"));
    expect(totals).toHaveLength(1);
    expect(totals[0]!.total).toBe(23590 + 20000);
    expect(cardMonthTotal("card-nubank", entriesOf("2026-07"), true)).toBe(20000);
  });

  it("muda entre meses mantendo as parcelas certas", () => {
    const agosto = entriesOf("2026-08");
    expect(agosto).toHaveLength(1);
    expect(agosto[0]!.expense.description).toBe("Notebook");
    expect(agosto[0]!.installment.installment_number).toBe(2);
    expect(sumEntries(agosto)).toBe(20000);
    expect(entriesOf("2027-07")).toHaveLength(0);
  });
});
