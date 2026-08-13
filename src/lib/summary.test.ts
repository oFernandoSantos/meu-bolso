import { describe, expect, it } from "vitest";
import {
  buildInstallments,
  cardMonthTotal,
  entriesForMonth,
  normalizeExpenseInput,
  rebuildInstallments,
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

const pix = makeExpense({ id: "e3", description: "Almoco", total_amount: 3000 });
const dinheiro = makeExpense({
  id: "e4",
  description: "Feira",
  total_amount: 5000,
  payment_method: "cash",
});

const expenses = [mercado, notebook, pix, dinheiro];
const installments = expenses.flatMap((expense) =>
  buildInstallments(
    expense,
    expense.card_id ? (cards.find((card) => card.id === expense.card_id) ?? null) : null,
  ),
);

const entriesOf = (month: string) =>
  entriesForMonth(month, expenses, installments, cards, categories);

describe("parcelas", () => {
  it("cria uma parcela por mes no credito usando fechamento do cartao", () => {
    const parcels = buildInstallments(notebook, cards[0]!);
    expect(parcels).toHaveLength(12);
    expect(parcels[0]!.competence_month).toBe("2026-08");
    expect(parcels[5]!.competence_month).toBe("2027-01");
    expect(parcels[11]!.competence_month).toBe("2027-07");
    expect(parcels.reduce((sum, item) => sum + item.amount, 0)).toBe(240000);
  });

  it("nao parcela debito, pix, dinheiro ou outro", () => {
    expect(buildInstallments(mercado, cards[0]!)).toHaveLength(1);
    expect(normalizeExpenseInput({ ...pix, installment_count: 6 }).installment_count).toBe(1);
    expect(normalizeExpenseInput({ ...pix, card_id: "card-nubank" }).card_id).toBeNull();
  });

  it("mantem compra ate o dia de fechamento no vencimento esperado", () => {
    const invoiceCycleExpense = makeExpense({
      id: "e6",
      description: "Curso",
      total_amount: 10000,
      payment_method: "credit",
      card_id: "card-nubank",
      expense_date: "2026-08-19",
    });

    const parcels = buildInstallments(invoiceCycleExpense, cards[0]!);
    expect(parcels[0]!.competence_month).toBe("2026-08");
  });

  it("joga compra antes do fechamento 19 para a fatura com vencimento no dia 01", () => {
    const card = {
      ...cards[0]!,
      id: "card-virada",
      closing_day: 19,
      due_day: 1,
    };

    const beforeClosing = buildInstallments(
      makeExpense({
        id: "e7",
        description: "Assinatura",
        total_amount: 3000,
        payment_method: "credit",
        card_id: card.id,
        expense_date: "2026-08-18",
      }),
      card,
    );
    const afterClosing = buildInstallments(
      makeExpense({
        id: "e8",
        description: "Curso",
        total_amount: 10000,
        payment_method: "credit",
        card_id: card.id,
        expense_date: "2026-08-20",
      }),
      card,
    );

    expect(beforeClosing[0]!.competence_month).toBe("2026-09");
    expect(afterClosing[0]!.competence_month).toBe("2026-10");
  });

  it("recalcula as parcelas quando o cartao muda", () => {
    const rebuilt = rebuildInstallments(expenses, [
      {
        ...cards[0]!,
        closing_day: 19,
        due_day: 1,
      },
    ]);

    const notebookInstallments = rebuilt.filter((item) => item.expense_id === notebook.id);
    expect(notebookInstallments[0]!.competence_month).toBe("2026-09");
    expect(notebookInstallments[1]!.competence_month).toBe("2026-10");
  });

  it("calcula a competencia separado para cada cartao", () => {
    const cardA: Card = {
      ...cards[0]!,
      id: "card-a",
      name: "Cartao A",
      closing_day: 19,
      due_day: 1,
    };
    const cardB: Card = {
      ...cards[0]!,
      id: "card-b",
      name: "Cartao B",
      closing_day: 25,
      due_day: 30,
    };

    const expenseA = makeExpense({
      id: "e9",
      description: "Compra A",
      total_amount: 10000,
      payment_method: "credit",
      card_id: cardA.id,
      expense_date: "2026-08-20",
    });
    const expenseB = makeExpense({
      id: "e10",
      description: "Compra B",
      total_amount: 10000,
      payment_method: "credit",
      card_id: cardB.id,
      expense_date: "2026-08-20",
    });

    const installmentsA = buildInstallments(expenseA, cardA);
    const installmentsB = buildInstallments(expenseB, cardB);

    expect(installmentsA[0]!.competence_month).toBe("2026-10");
    expect(installmentsB[0]!.competence_month).toBe("2026-08");
  });
});

describe("totais mensais", () => {
  it("soma o total do mes conforme competencia da fatura", () => {
    expect(sumEntries(entriesOf("2026-07"))).toBe(23590 + 3000 + 5000);
    expect(sumEntries(entriesOf("2026-08"))).toBe(20000);
  });

  it("soma por forma de pagamento", () => {
    const julyTotals = totalsByPaymentMethod(entriesOf("2026-07"));
    const augustTotals = totalsByPaymentMethod(entriesOf("2026-08"));

    expect(julyTotals.debit).toBe(23590);
    expect(julyTotals.credit).toBe(0);
    expect(julyTotals.pix).toBe(3000);
    expect(julyTotals.cash).toBe(5000);
    expect(julyTotals.other).toBe(0);

    expect(augustTotals.credit).toBe(20000);
  });

  it("soma por categoria", () => {
    const julyTotals = totalsByCategory(entriesOf("2026-07"));
    const augustTotals = totalsByCategory(entriesOf("2026-08"));

    expect(julyTotals.find((item) => item.label === "Mercado")!.total).toBe(23590 + 3000 + 5000);
    expect(julyTotals.find((item) => item.label === "Compras")).toBeUndefined();
    expect(augustTotals.find((item) => item.label === "Compras")!.total).toBe(20000);
  });

  it("soma por cartao", () => {
    const julyTotals = totalsByCard(entriesOf("2026-07"));
    expect(julyTotals).toHaveLength(1);
    expect(julyTotals[0]!.total).toBe(23590);
    expect(cardMonthTotal("card-nubank", entriesOf("2026-07"), true)).toBe(0);
    expect(cardMonthTotal("card-nubank", entriesOf("2026-08"), true)).toBe(20000);
  });

  it("nao soma pagamento de fatura como gasto do cartao", () => {
    const invoicePayment = makeExpense({
      id: "e5",
      description: "Pagamento fatura",
      total_amount: 120000,
      payment_method: "debit",
      card_id: "card-nubank",
      category_id: "cat-compras",
    });

    const mixedEntries = entriesForMonth(
      "2026-07",
      [...expenses, invoicePayment],
      [...installments, ...buildInstallments(invoicePayment, cards[0]!)],
      cards,
      categories,
    );

    expect(sumEntries(mixedEntries)).toBe(23590 + 3000 + 5000);
    expect(totalsByCategory(mixedEntries).find((item) => item.label === "Compras")).toBeUndefined();
    expect(cardMonthTotal("card-nubank", mixedEntries)).toBe(23590);
    expect(cardMonthTotal("card-nubank", mixedEntries, true)).toBe(0);
  });

  it("muda entre meses mantendo as parcelas certas", () => {
    const agosto = entriesOf("2026-08");
    expect(agosto).toHaveLength(1);
    expect(agosto[0]!.expense.description).toBe("Notebook");
    expect(agosto[0]!.installment.installment_number).toBe(1);
    expect(sumEntries(agosto)).toBe(20000);
    expect(entriesOf("2027-08")).toHaveLength(0);
  });
});
