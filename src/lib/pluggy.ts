import { monthKey } from "./dates";
import { createId } from "./storage";
import type { Card, Category, Database, Expense, PaymentMethod } from "./types";

const IMPORT_NOTE_PREFIX = "[pluggy:";
const IMPORT_CATEGORY_COLORS = ["#f97316", "#16a34a", "#0ea5e9", "#8b5cf6", "#ef4444", "#eab308"];

export type PluggyItemSummary = {
  id: string;
  status?: string | null;
  executionStatus?: string | null;
  connector?: { name?: string | null } | null;
};

export type PluggyAccount = {
  id: string;
  type?: string | null;
  name?: string | null;
  marketingName?: string | null;
  number?: string | null;
};

export type PluggyTransaction = {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  description?: string | null;
  descriptionRaw?: string | null;
  category?: string | null;
  type?: string | null;
  status?: string | null;
  creditCardMetadata?: {
    installmentNumber?: number | null;
    totalInstallments?: number | null;
  } | null;
};

export type PluggySyncPayload = {
  item: PluggyItemSummary;
  accounts: PluggyAccount[];
  transactionsByAccount: Record<string, PluggyTransaction[]>;
};

export type PluggyMergeResult = {
  db: Database;
  importedCount: number;
  latestImportedMonth: string | null;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function inferPaymentMethod(account: PluggyAccount, transaction: PluggyTransaction): PaymentMethod {
  if (account.type === "CREDIT") return "credit";

  const text = normalizeText(
    [transaction.description, transaction.descriptionRaw, transaction.category]
      .filter(Boolean)
      .join(" "),
  );

  if (text.includes("pix")) return "pix";
  if (text.includes("dinheiro") || text.includes("saque")) return "cash";
  return "debit";
}

function toCents(amount: number): number {
  return Math.round(Math.abs(amount) * 100);
}

function transactionAlreadyImported(expenses: Expense[], transactionId: string): boolean {
  return expenses.some((expense) =>
    expense.notes?.includes(`${IMPORT_NOTE_PREFIX}${transactionId}]`),
  );
}

function cardLabel(account: PluggyAccount): string {
  return (
    account.name?.trim() ||
    account.marketingName?.trim() ||
    (account.type === "CREDIT" ? "Cartao Pluggy" : "Conta Pluggy")
  );
}

function accountSuffix(account: PluggyAccount): string {
  const digits = (account.number ?? "").replace(/\D/g, "");
  return digits ? digits.slice(-4) : account.id.slice(0, 4);
}

function ensureCard(
  db: Database,
  account: PluggyAccount,
  connectorName: string | null,
): [Database, string | null] {
  const method = account.type === "CREDIT" ? "credit" : "debit";
  const label = cardLabel(account);
  const suffix = accountSuffix(account);

  const existing = db.cards.find(
    (card) =>
      normalizeText(card.name) === normalizeText(label) &&
      normalizeText(card.institution ?? "") === normalizeText(connectorName ?? ""),
  );

  if (existing) return [db, existing.id];

  const now = new Date().toISOString();
  const card: Card = {
    id: createId(),
    name: suffix ? `${label} ${suffix}` : label,
    institution: connectorName,
    type: method === "credit" ? "credit" : "debit",
    credit_limit: null,
    closing_day: null,
    due_day: null,
    color: method === "credit" ? "#2563eb" : "#64748b",
    active: true,
    created_at: now,
    updated_at: now,
  };

  return [{ ...db, cards: [...db.cards, card] }, card.id];
}

function ensureCategory(db: Database, label: string | null | undefined): [Database, string] {
  const normalized = normalizeText(label || "Outros");
  const fallback = db.categories.find((category) => normalizeText(category.name) === "outros");
  if (!normalized || normalized === "outros")
    return [db, fallback?.id ?? db.categories[0]?.id ?? ""];

  const existing = db.categories.find((category) => normalizeText(category.name) === normalized);
  if (existing) return [db, existing.id];

  const now = new Date().toISOString();
  const nextIndex = db.categories.length % IMPORT_CATEGORY_COLORS.length;
  const category: Category = {
    id: createId(),
    name: label!.trim(),
    icon: "circle",
    color: IMPORT_CATEGORY_COLORS[nextIndex] ?? "#64748b",
    active: true,
    created_at: now,
    updated_at: now,
  };

  return [{ ...db, categories: [...db.categories, category] }, category.id];
}

function shouldImportTransaction(account: PluggyAccount, transaction: PluggyTransaction): boolean {
  const amount = Number(transaction.amount);
  if (!Number.isFinite(amount) || amount === 0) return false;

  if (account.type === "CREDIT") {
    if (transaction.type === "DEBIT") return true;
    return amount < 0;
  }
  if (transaction.type === "DEBIT") return true;
  return amount < 0;
}

function appendExpense(
  db: Database,
  transaction: PluggyTransaction,
  paymentMethod: PaymentMethod,
  cardId: string | null,
  categoryId: string,
): Database {
  const now = new Date().toISOString();
  const description =
    transaction.description?.trim() || transaction.descriptionRaw?.trim() || "Transacao Pluggy";
  const amount = toCents(Number(transaction.amount));

  const expense: Expense = {
    id: createId(),
    description,
    total_amount: amount,
    expense_date: transaction.date.slice(0, 10),
    payment_method: paymentMethod,
    card_id: cardId,
    category_id: categoryId,
    installment_count: 1,
    notes: `${IMPORT_NOTE_PREFIX}${transaction.id}]`,
    created_at: now,
    updated_at: now,
  };

  return {
    ...db,
    expenses: [...db.expenses, expense],
    installments: [
      ...db.installments,
      {
        id: createId(),
        expense_id: expense.id,
        installment_number: 1,
        installment_count: 1,
        amount,
        competence_month: monthKey(expense.expense_date),
        created_at: now,
        updated_at: now,
      },
    ],
  };
}

export function mergePluggySync(db: Database, payload: PluggySyncPayload): PluggyMergeResult {
  let nextDb = db;
  let importedCount = 0;
  let latestImportedMonth: string | null = null;
  const connectorName = payload.item.connector?.name ?? null;

  for (const account of payload.accounts) {
    const transactions = payload.transactionsByAccount[account.id] ?? [];
    const paymentMethodBase = account.type === "CREDIT" ? "credit" : "debit";
    let cardId: string | null = null;

    if (
      paymentMethodBase === "credit" ||
      transactions.some((tx) => inferPaymentMethod(account, tx) === "debit")
    ) {
      [nextDb, cardId] = ensureCard(nextDb, account, connectorName);
    }

    for (const transaction of transactions) {
      if (!shouldImportTransaction(account, transaction)) continue;
      if (transactionAlreadyImported(nextDb.expenses, transaction.id)) continue;

      const paymentMethod = inferPaymentMethod(account, transaction);
      const finalCardId = paymentMethod === "credit" || paymentMethod === "debit" ? cardId : null;
      const categoryLabel = transaction.category?.trim() || "Outros";
      const ensured = ensureCategory(nextDb, categoryLabel);
      nextDb = ensured[0];
      const categoryId = ensured[1];
      nextDb = appendExpense(nextDb, transaction, paymentMethod, finalCardId, categoryId);
      latestImportedMonth = monthKey(transaction.date.slice(0, 10));
      importedCount += 1;
    }
  }

  return { db: nextDb, importedCount, latestImportedMonth };
}
