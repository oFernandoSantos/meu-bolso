import { create } from "zustand";
import type { Card, Category, Database, Expense, Installment, ThemeMode } from "@/lib/types";
import { createId, emptyDatabase, loadDatabase, saveDatabase } from "@/lib/storage";
import { queueRemoteDatabasePush } from "@/lib/sync";
import {
  buildInstallments,
  normalizeExpenseInput,
  rebuildInstallments,
  type ExpenseInput,
} from "@/lib/summary";

interface AppState extends Database {
  hydrated: boolean;
  hydrate: () => void;
  addExpense: (input: ExpenseInput) => void;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => void;
  addCard: (input: Omit<Card, "id" | "created_at" | "updated_at">) => void;
  updateCard: (id: string, input: Omit<Card, "id" | "created_at" | "updated_at">) => void;
  deleteCard: (id: string) => void;
  addCategory: (input: Omit<Category, "id" | "created_at" | "updated_at">) => void;
  updateCategory: (id: string, input: Omit<Category, "id" | "created_at" | "updated_at">) => void;
  deleteCategory: (id: string) => void;
  setTheme: (theme: ThemeMode) => void;
  replaceAll: (db: Database) => void;
  clearAll: () => void;
}

const base = emptyDatabase();

function snapshotFromState(
  state: AppState,
  lastLocalChangeAt = new Date().toISOString(),
): Database {
  return {
    cards: state.cards,
    categories: state.categories,
    expenses: state.expenses,
    installments: state.installments,
    settings: {
      ...state.settings,
      sync: {
        remote_updated_at: state.settings.sync?.remote_updated_at ?? null,
        last_local_change_at: lastLocalChangeAt,
      },
    },
  };
}

export const useAppStore = create<AppState>()((set, get) => {
  const persist = () => {
    const now = new Date().toISOString();
    const db = snapshotFromState(get(), now);
    saveDatabase(db);
    queueRemoteDatabasePush(db, (updatedAt) => {
      if (!updatedAt) return;
      set((state) => ({
        settings: {
          ...state.settings,
          sync: {
            remote_updated_at: updatedAt,
            last_local_change_at: state.settings.sync?.last_local_change_at ?? now,
          },
        },
      }));
      saveDatabase(snapshotFromState(get(), get().settings.sync?.last_local_change_at ?? now));
    });
    return db;
  };

  return {
    ...base,
    hydrated: false,

    hydrate: () => {
      if (get().hydrated) return;
      const db = loadDatabase();
      set({ ...db, hydrated: true });
    },

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
      persist();
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
      persist();
    },

    deleteExpense: (id) => {
      set((state) => ({
        expenses: state.expenses.filter((expense) => expense.id !== id),
        installments: state.installments.filter((installment) => installment.expense_id !== id),
      }));
      persist();
    },

    addCard: (input) => {
      const timestamp = new Date().toISOString();
      set((state) => ({
        cards: [
          ...state.cards,
          { id: createId(), ...input, created_at: timestamp, updated_at: timestamp },
        ],
      }));
      persist();
    },

    updateCard: (id, input) => {
      set((state) => {
        const updatedAt = new Date().toISOString();
        const cards = state.cards.map((card) =>
          card.id === id ? { ...card, ...input, updated_at: updatedAt } : card,
        );

        return {
          cards,
          installments: rebuildInstallments(state.expenses, cards),
        };
      });
      persist();
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
      persist();
    },

    addCategory: (input) => {
      const timestamp = new Date().toISOString();
      set((state) => ({
        categories: [
          ...state.categories,
          { id: createId(), ...input, created_at: timestamp, updated_at: timestamp },
        ],
      }));
      persist();
    },

    updateCategory: (id, input) => {
      set((state) => ({
        categories: state.categories.map((category) =>
          category.id === id
            ? { ...category, ...input, updated_at: new Date().toISOString() }
            : category,
        ),
      }));
      persist();
    },

    deleteCategory: (id) => {
      set((state) => ({ categories: state.categories.filter((category) => category.id !== id) }));
      persist();
    },

    setTheme: (theme) => {
      set({ settings: { ...get().settings, theme } });
      persist();
    },

    replaceAll: (db) => {
      set({ ...db });
      saveDatabase(db);
    },

    clearAll: () => {
      const db = emptyDatabase();
      set({ ...db });
      saveDatabase(db);
    },
  };
});
