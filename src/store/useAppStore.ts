import { create } from "zustand";
import type {
  Card,
  Category,
  Database,
  Expense,
  Installment,
  ThemeMode,
} from "@/lib/types";
import { createId, emptyDatabase, loadDatabase, saveDatabase } from "@/lib/storage";
import { buildInstallments, normalizeExpenseInput, type ExpenseInput } from "@/lib/summary";

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

function persist(state: AppState): Database {
  const db: Database = {
    cards: state.cards,
    categories: state.categories,
    expenses: state.expenses,
    installments: state.installments,
    settings: state.settings,
  };
  saveDatabase(db);
  return db;
}

export const useAppStore = create<AppState>()((set, get) => ({
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
    const installments = buildInstallments(expense);
    set((state) => ({
      expenses: [...state.expenses, expense],
      installments: [...state.installments, ...installments],
    }));
    persist(get());
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
    const installments: Installment[] = buildInstallments(updated);
    set((state) => ({
      expenses: state.expenses.map((expense) => (expense.id === id ? updated : expense)),
      installments: [
        ...state.installments.filter((installment) => installment.expense_id !== id),
        ...installments,
      ],
    }));
    persist(get());
  },

  deleteExpense: (id) => {
    set((state) => ({
      expenses: state.expenses.filter((expense) => expense.id !== id),
      installments: state.installments.filter((installment) => installment.expense_id !== id),
    }));
    persist(get());
  },

  addCard: (input) => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      cards: [...state.cards, { id: createId(), ...input, created_at: timestamp, updated_at: timestamp }],
    }));
    persist(get());
  },

  updateCard: (id, input) => {
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === id ? { ...card, ...input, updated_at: new Date().toISOString() } : card,
      ),
    }));
    persist(get());
  },

  deleteCard: (id) => {
    set((state) => ({
      cards: state.cards.filter((card) => card.id !== id),
      // Gastos ficam registrados, mas sem cartão vinculado.
      expenses: state.expenses.map((expense) =>
        expense.card_id === id ? { ...expense, card_id: null } : expense,
      ),
    }));
    persist(get());
  },

  addCategory: (input) => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      categories: [
        ...state.categories,
        { id: createId(), ...input, created_at: timestamp, updated_at: timestamp },
      ],
    }));
    persist(get());
  },

  updateCategory: (id, input) => {
    set((state) => ({
      categories: state.categories.map((category) =>
        category.id === id
          ? { ...category, ...input, updated_at: new Date().toISOString() }
          : category,
      ),
    }));
    persist(get());
  },

  deleteCategory: (id) => {
    set((state) => ({ categories: state.categories.filter((category) => category.id !== id) }));
    persist(get());
  },

  setTheme: (theme) => {
    set({ settings: { ...get().settings, theme } });
    persist(get());
  },

  replaceAll: (db) => {
    set({ ...db });
    persist(get());
  },

  clearAll: () => {
    set({ ...emptyDatabase() });
    persist(get());
  },
}));
