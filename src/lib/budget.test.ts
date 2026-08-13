import { describe, expect, it } from "vitest";
import { monthBudgetSnapshot, recurringIncomeForMonth } from "./budget";
import { buildInstallments } from "./summary";
import type { Card, Category, Database, Expense, PaymentMethod } from "./types";

const now = "2026-07-01T00:00:00.000Z";

const card: Card = {
  id: "card-1",
  name: "Nubank",
  institution: "Nu",
  type: "both",
  brand: null,
  last4: null,
  credit_limit: 300000,
  closing_day: 19,
  due_day: 1,
  color: "#8b5cf6",
  active: true,
  created_at: now,
  updated_at: now,
};

const category: Category = {
  id: "cat-1",
  name: "Compras",
  icon: "shopping-bag",
  color: "#eab308",
  active: true,
  created_at: now,
  updated_at: now,
};

function makeExpense(overrides: Partial<Expense> & { id: string }): Expense {
  return {
    id: overrides.id,
    description: "Gasto",
    total_amount: 10000,
    expense_date: "2026-08-18",
    payment_method: "pix" as PaymentMethod,
    card_id: null,
    category_id: category.id,
    installment_count: 1,
    notes: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe("budget", () => {
  it("mantem a renda fixa nos meses seguintes ate ser alterada", () => {
    expect(
      recurringIncomeForMonth("2026-08", {
        "2026-07": 500000,
      }),
    ).toBe(500000);

    expect(
      recurringIncomeForMonth("2026-10", {
        "2026-07": 500000,
        "2026-09": 650000,
      }),
    ).toBe(650000);
  });

  it("usa a renda extra so no mes e carrega saldo positivo para o mes seguinte", () => {
    const augustExpense = makeExpense({
      id: "expense-august",
      total_amount: 400000,
      expense_date: "2026-08-18",
    });
    const septemberExpense = makeExpense({
      id: "expense-september",
      total_amount: 300000,
      expense_date: "2026-09-18",
    });

    const expenses = [augustExpense, septemberExpense];
    const installments = expenses.flatMap((expense) => buildInstallments(expense, null));

    const db: Database = {
      cards: [card],
      categories: [category],
      expenses,
      installments,
      settings: {
        theme: "dark",
        pluggy: {
          item_id: null,
          connector_name: null,
          item_status: null,
          last_sync_at: null,
          last_error: null,
          proxy_url: null,
        },
        auth: {
          user_id: null,
          email: null,
          access_token: null,
          refresh_token: null,
          expires_at: null,
          session_active: false,
        },
        monthly_income_by_month: {
          "2026-08": 500000,
        },
        monthly_income_extras_by_month: {
          "2026-08": [{ id: "extra-1", description: "Freela", amount: 200000 }],
        },
        monthly_savings_by_month: {},
      },
    };

    const august = monthBudgetSnapshot(db, "2026-08");
    const september = monthBudgetSnapshot(db, "2026-09");

    expect(august.fixedIncome).toBe(500000);
    expect(august.extraIncome).toBe(200000);
    expect(august.closingBalance).toBe(300000);

    expect(september.fixedIncome).toBe(500000);
    expect(september.extraIncome).toBe(0);
    expect(september.carriedBalance).toBe(300000);
    expect(september.closingBalance).toBe(500000);
  });

  it("nao carrega saldo negativo para frente", () => {
    const augustExpense = makeExpense({
      id: "expense-over",
      total_amount: 700000,
      expense_date: "2026-08-18",
    });

    const db: Database = {
      cards: [card],
      categories: [category],
      expenses: [augustExpense],
      installments: buildInstallments(augustExpense, null),
      settings: {
        theme: "dark",
        pluggy: {
          item_id: null,
          connector_name: null,
          item_status: null,
          last_sync_at: null,
          last_error: null,
          proxy_url: null,
        },
        auth: {
          user_id: null,
          email: null,
          access_token: null,
          refresh_token: null,
          expires_at: null,
          session_active: false,
        },
        monthly_income_by_month: {
          "2026-08": 500000,
        },
        monthly_income_extras_by_month: {},
        monthly_savings_by_month: {},
      },
    };

    const august = monthBudgetSnapshot(db, "2026-08");
    const september = monthBudgetSnapshot(db, "2026-09");

    expect(august.closingBalance).toBe(-200000);
    expect(september.carriedBalance).toBe(0);
  });
});
