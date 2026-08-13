import { monthKey, shiftMonth } from "./dates";
import { createId } from "./storage";
import { buildInstallments } from "./summary";
import type { Card, Category, Database, Expense, PaymentMethod } from "./types";

const IMPORT_NOTE_PREFIX = "[pluggy:";
const IMPORT_CATEGORY_COLORS = ["#f97316", "#16a34a", "#0ea5e9", "#8b5cf6", "#ef4444", "#eab308"];
const INVOICE_PAYMENT_PATTERNS = [
  "pagamento fatura",
  "pagamento de fatura",
  "pgto fatura",
  "fatura cartao",
  "cartao de credito",
  "credit card payment",
  "payment invoice",
];

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
  creditData?: {
    limit?: number | null;
    closeDay?: number | null;
    dueDay?: number | null;
  } | null;
  creditLimit?: number | null;
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

function transactionKey(itemId: string, accountId: string, transactionId: string): string {
  return `${itemId}:${accountId}:${transactionId}`;
}

function importedNote(itemId: string, accountId: string, transactionId: string): string {
  return `${IMPORT_NOTE_PREFIX}${transactionKey(itemId, accountId, transactionId)}]`;
}

function transactionAlreadyImported(
  expenses: Expense[],
  itemId: string,
  accountId: string,
  transactionId: string,
): boolean {
  return expenses.some((expense) =>
    expense.notes?.includes(importedNote(itemId, accountId, transactionId)),
  );
}

function removeImportedTransaction(
  db: Database,
  itemId: string,
  accountId: string,
  transactionId: string,
): Database {
  const expense = db.expenses.find((item) =>
    item.notes?.includes(importedNote(itemId, accountId, transactionId)),
  );
  if (!expense) return db;

  return {
    ...db,
    expenses: db.expenses.filter((item) => item.id !== expense.id),
    installments: db.installments.filter((item) => item.expense_id !== expense.id),
  };
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

  const finalName = suffix ? `${label} ${suffix}` : label;
  const existing = db.cards.find((card) => {
    return (
      normalizeText(card.name) === normalizeText(finalName) &&
      normalizeText(card.institution ?? "") === normalizeText(connectorName ?? "") &&
      card.type === (method === "credit" ? "credit" : "debit")
    );
  });

  if (existing) return [db, existing.id];

  const now = new Date().toISOString();
  const card: Card = {
    id: createId(),
    name: finalName,
    institution: connectorName,
    type: method === "credit" ? "credit" : "debit",
    brand: null,
    last4: suffix || null,
    credit_limit:
      typeof account.creditData?.limit === "number"
        ? toCents(account.creditData.limit)
        : typeof account.creditLimit === "number"
          ? toCents(account.creditLimit)
          : null,
    closing_day:
      typeof account.creditData?.closeDay === "number" ? account.creditData.closeDay : null,
    due_day: typeof account.creditData?.dueDay === "number" ? account.creditData.dueDay : null,
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

function shouldIgnoreAsInvoicePayment(
  account: PluggyAccount,
  transaction: PluggyTransaction,
): boolean {
  if (account.type === "CREDIT") return false;

  const text = normalizeText(
    [transaction.description, transaction.descriptionRaw, transaction.category]
      .filter(Boolean)
      .join(" "),
  );

  return INVOICE_PAYMENT_PATTERNS.some((pattern) => text.includes(pattern));
}

function appendExpense(
  db: Database,
  transaction: PluggyTransaction,
  paymentMethod: PaymentMethod,
  cardId: string | null,
  categoryId: string,
  itemId: string,
): Database {
  const now = new Date().toISOString();
  const description =
    transaction.description?.trim() || transaction.descriptionRaw?.trim() || "Transacao Pluggy";
  const amount = toCents(Number(transaction.amount));
  const totalInstallments = Math.max(
    1,
    Math.floor(transaction.creditCardMetadata?.totalInstallments ?? 1),
  );
  const installmentNumber = Math.max(
    1,
    Math.floor(transaction.creditCardMetadata?.installmentNumber ?? 1),
  );

  const expense: Expense = {
    id: createId(),
    description,
    total_amount: amount * totalInstallments,
    expense_date: transaction.date.slice(0, 10),
    payment_method: paymentMethod,
    card_id: cardId,
    category_id: categoryId,
    installment_count: paymentMethod === "credit" ? totalInstallments : 1,
    notes: importedNote(itemId, transaction.accountId, transaction.id),
    created_at: now,
    updated_at: now,
  };

  const card = cardId ? (db.cards.find((item) => item.id === cardId) ?? null) : null;
  const installments = buildInstallments(expense, card).map((installment) => ({
    ...installment,
    competence_month:
      paymentMethod === "credit" && totalInstallments > 1
        ? shiftMonth(installment.competence_month, -(installmentNumber - 1))
        : installment.competence_month,
  }));

  return {
    ...db,
    expenses: [...db.expenses, expense],
    installments: [...db.installments, ...installments],
  };
}

export function mergePluggySync(db: Database, payload: PluggySyncPayload): PluggyMergeResult {
  let nextDb = db;
  let importedCount = 0;
  let latestImportedMonth: string | null = null;
  const connectorName = payload.item.connector?.name ?? null;
  const items = [
    ...nextDb.settings.pluggy.items.filter((item) => item.item_id !== payload.item.id),
    {
      item_id: payload.item.id,
      connector_name: connectorName,
      item_status: payload.item.executionStatus ?? payload.item.status ?? null,
      last_sync_at: new Date().toISOString(),
      last_error: null,
    },
  ];

  nextDb = {
    ...nextDb,
    settings: {
      ...nextDb.settings,
      pluggy: {
        ...nextDb.settings.pluggy,
        item_id: payload.item.id,
        connector_name: connectorName,
        item_status: payload.item.executionStatus ?? payload.item.status ?? null,
        last_sync_at: new Date().toISOString(),
        last_error: null,
        items,
      },
    },
  };

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
      if (shouldIgnoreAsInvoicePayment(account, transaction)) {
        nextDb = removeImportedTransaction(nextDb, payload.item.id, account.id, transaction.id);
        continue;
      }

      if (!shouldImportTransaction(account, transaction)) continue;
      if (
        transactionAlreadyImported(nextDb.expenses, payload.item.id, account.id, transaction.id)
      ) {
        continue;
      }

      const paymentMethod = inferPaymentMethod(account, transaction);
      const finalCardId = paymentMethod === "credit" || paymentMethod === "debit" ? cardId : null;
      const categoryLabel = transaction.category?.trim() || "Outros";
      const ensured = ensureCategory(nextDb, categoryLabel);
      nextDb = ensured[0];
      const categoryId = ensured[1];
      nextDb = appendExpense(
        nextDb,
        transaction,
        paymentMethod,
        finalCardId,
        categoryId,
        payload.item.id,
      );
      latestImportedMonth = monthKey(transaction.date.slice(0, 10));
      importedCount += 1;
    }
  }

  return { db: nextDb, importedCount, latestImportedMonth };
}
