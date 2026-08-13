import { create } from "zustand";

import { createId, emptyDatabase } from "../lib/storage";
import {
  buildInstallments,
  normalizeExpenseInput,
  rebuildInstallments,
  type ExpenseInput,
} from "../lib/summary";
import type { Card, Category, Database, Expense, Installment, ThemeMode } from "../lib/types";

interface AppState extends Database {
  hydrated: boolean;
  hydrateFromDb: (db: Database) => void;
  markHydrated: () => void;
  addExpense: (input: ExpenseInput) => void;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => void;
  addCard: (input: Omit<Card, "id" | "created_at" | "updated_at">) => void;
  deleteCard: (id: string) => void;
  addCategory: (input: Omit<Category, "id" | "created_at" | "updated_at">) => void;
  deleteCategory: (id: string) => void;
  setTheme: (theme: ThemeMode) => void;
  replaceAll: (db: Database) => void;
  clearAll: () => void;
}

const base = emptyDatabase();

export function selectDatabase(state: AppState): Database {
  return {
    cards: state.cards,
    categories: state.categories,
    expenses: state.expenses,
    installments: state.installments,
    settings: state.settings,
  };
}

export const useNativeAppStore = create<AppState>()((set, get) => ({
  ...base,
  hydrated: false,

  hydrateFromDb: (db) => set({ ...db, hydrated: true }),
  markHydrated: () => set({ hydrated: true }),

  addExpense: (input) => {
    const normalized = normalizeExpenseInput(input);
    const timestamp = new Date().toISOString();
    const expense: Expense = {
      id: createId(),
      ...normalized,
      created_at: timestamp,
      updated_at: timestamp,
    };
    const card = expense.card_id
      ? (get().cards.find((item) => item.id === expense.card_id) ?? null)
      : null;
    const installments = buildInstallments(expense, card);
    set((state) => ({
      expenses: [...state.expenses, expense],
      installments: [...state.installments, ...installments],
    }));
  },

  updateExpense: (id, input) => {
    const normalized = normalizeExpenseInput(input);
    const current = get().expenses.find((expense) => expense.id === id);
    if (!current) return;
    const updated: Expense = {
      ...current,
      ...normalized,
      updated_at: new Date().toISOString(),
    };
    const card = updated.card_id
      ? (get().cards.find((item) => item.id === updated.card_id) ?? null)
      : null;
    const installments: Installment[] = buildInstallments(updated, card);
    set((state) => ({
      expenses: state.expenses.map((expense) => (expense.id === id ? updated : expense)),
      installments: [
        ...state.installments.filter((installment) => installment.expense_id !== id),
        ...installments,
      ],
    }));
  },

  deleteExpense: (id) => {
    set((state) => ({
      expenses: state.expenses.filter((expense) => expense.id !== id),
      installments: state.installments.filter((installment) => installment.expense_id !== id),
    }));
  },

  addCard: (input) => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      cards: [
        ...state.cards,
        { id: createId(), ...input, created_at: timestamp, updated_at: timestamp },
      ],
    }));
  },

  deleteCard: (id) => {
    set((state) => {
      const cards = state.cards.filter((card) => card.id !== id);
      const expenses = state.expenses.map((expense) =>
        expense.card_id === id ? { ...expense, card_id: null } : expense,
      );

      return {
        cards,
        expenses,
        installments: rebuildInstallments(expenses, cards),
      };
    });
  },

  addCategory: (input) => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      categories: [
        ...state.categories,
        { id: createId(), ...input, created_at: timestamp, updated_at: timestamp },
      ],
    }));
  },

  deleteCategory: (id) => {
    set((state) => ({
      categories: state.categories.filter((category) => category.id !== id),
    }));
  },

  setTheme: (theme) => set({ settings: { ...get().settings, theme } }),
  replaceAll: (db) => set({ ...db }),
  clearAll: () => set({ ...emptyDatabase() }),
}));
