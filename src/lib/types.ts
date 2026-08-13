export type PaymentMethod = "credit" | "debit" | "pix" | "cash" | "other";
export type CardType = "credit" | "debit" | "both";
export type CardBrand = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "nubank" | "unknown";
export type ThemeMode = "light" | "dark" | "system";

export interface PluggyConnectionSettings {
  item_id: string;
  connector_name: string | null;
  item_status: string | null;
  last_sync_at: string | null;
  last_error: string | null;
}

export interface SyncSettings {
  remote_updated_at: string | null;
  last_local_change_at: string | null;
}

export interface PluggySettings {
  item_id: string | null;
  connector_name: string | null;
  item_status: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  proxy_url: string | null;
  items: PluggyConnectionSettings[];
}

export interface AuthSettings {
  user_id: string | null;
  email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  session_active: boolean;
}

export interface Card {
  id: string;
  name: string;
  institution: string | null;
  type: CardType;
  brand: CardBrand | null;
  last4: string | null;
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

export interface MonthlyIncomeExtra {
  id: string;
  description: string;
  amount: number;
}

export interface MonthlySavingsEntry {
  id: string;
  description: string;
  amount: number;
  created_at: string;
  already_saved: boolean;
  deduct_from_income: boolean;
}

export interface Settings {
  theme: ThemeMode;
  pluggy: PluggySettings;
  auth: AuthSettings;
  sync?: SyncSettings;
  monthly_income_by_month: Record<string, number>;
  monthly_income_extras_by_month: Record<string, MonthlyIncomeExtra[]>;
  monthly_savings_by_month: Record<string, MonthlySavingsEntry[]>;
}

export interface Database {
  cards: Card[];
  categories: Category[];
  expenses: Expense[];
  installments: Installment[];
  settings: Settings;
}

/** Uma parcela ja combinada com dados do gasto. Usada nas listas e totais. */
export interface EntryView {
  installment: Installment;
  expense: Expense;
  card: Card | null;
  category: Category | null;
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "credit", label: "Cartao de credito" },
  { value: "debit", label: "Cartao de debito" },
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
  { value: "other", label: "Outro" },
];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  credit: "Credito",
  debit: "Debito",
  pix: "Pix",
  cash: "Dinheiro",
  other: "Outro",
};

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  credit: "Credito",
  debit: "Debito",
  both: "Credito e debito",
};

export function requiresCard(method: PaymentMethod): boolean {
  return method === "credit" || method === "debit";
}

export function allowsInstallments(method: PaymentMethod): boolean {
  return method === "credit";
}
