export type PaymentMethod = "credit" | "debit" | "pix" | "cash" | "other";
export type CardType = "credit" | "debit" | "both";
export type ThemeMode = "light" | "dark" | "system";

export interface Card {
  id: string;
  name: string;
  institution: string | null;
  type: CardType;
  credit_limit: number | null;
  closing_day: number | null;
  due_day: number | null;
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  description: string;
  total_amount: number;
  expense_date: string;
  payment_method: PaymentMethod;
  card_id: string | null;
  category_id: string;
  installment_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Installment {
  id: string;
  expense_id: string;
  installment_number: number;
  installment_count: number;
  amount: number;
  competence_month: string;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  theme: ThemeMode;
}

export interface Database {
  cards: Card[];
  categories: Category[];
  expenses: Expense[];
  installments: Installment[];
  settings: Settings;
}

/** Uma parcela já combinada com os dados do gasto — usada nas listas e totais. */
export interface EntryView {
  installment: Installment;
  expense: Expense;
  card: Card | null;
  category: Category | null;
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "credit", label: "Cartão de crédito" },
  { value: "debit", label: "Cartão de débito" },
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
  { value: "other", label: "Outro" },
];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  credit: "Crédito",
  debit: "Débito",
  pix: "Pix",
  cash: "Dinheiro",
  other: "Outro",
};

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  credit: "Crédito",
  debit: "Débito",
  both: "Crédito e débito",
};

export function requiresCard(method: PaymentMethod): boolean {
  return method === "credit" || method === "debit";
}

export function allowsInstallments(method: PaymentMethod): boolean {
  return method === "credit";
}
