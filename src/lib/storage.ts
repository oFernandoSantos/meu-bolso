import type {
  Card,
  Category,
  Database,
  Expense,
  Installment,
  MonthlyIncomeExtra,
  MonthlySavingsEntry,
  Settings,
} from "./types";

export const STORAGE_KEY = "gastos.db.v1";

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const DEFAULT_CATEGORIES: { name: string; icon: string; color: string }[] = [
  { name: "Alimentacao", icon: "utensils", color: "#f97316" },
  { name: "Mercado", icon: "shopping-cart", color: "#16a34a" },
  { name: "Transporte", icon: "car", color: "#0ea5e9" },
  { name: "Moradia", icon: "home", color: "#8b5cf6" },
  { name: "Saude", icon: "heart-pulse", color: "#ef4444" },
  { name: "Educacao", icon: "graduation-cap", color: "#2563eb" },
  { name: "Lazer", icon: "gamepad-2", color: "#ec4899" },
  { name: "Compras", icon: "shopping-bag", color: "#eab308" },
  { name: "Assinaturas", icon: "repeat", color: "#14b8a6" },
  { name: "Viagem", icon: "plane", color: "#06b6d4" },
  { name: "Presentes", icon: "gift", color: "#f43f5e" },
  { name: "Outros", icon: "circle-dashed", color: "#64748b" },
];

/** Slug estavel para ids previsiveis. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const SEED_TIMESTAMP = "2024-01-01T00:00:00.000Z";

export function seedCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((category) => ({
    id: `cat-${slugify(category.name)}`,
    name: category.name,
    icon: category.icon,
    color: category.color,
    active: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  }));
}

export function emptyDatabase(): Database {
  return {
    cards: [] as Card[],
    categories: seedCategories(),
    expenses: [],
    installments: [],
    settings: {
      theme: "dark",
      pluggy: {
        item_id: null,
        connector_name: null,
        item_status: null,
        last_sync_at: null,
        last_error: null,
        proxy_url: null,
        items: [],
      },
      auth: {
        user_id: null,
        email: null,
        access_token: null,
        refresh_token: null,
        expires_at: null,
        session_active: false,
      },
      sync: {
        remote_updated_at: null,
        last_local_change_at: null,
      },
      monthly_income_by_month: {},
      monthly_income_extras_by_month: {},
      monthly_savings_by_month: {},
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asPluggyItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isObject(item)) return [];
    const item_id = asString(item["item_id"]).trim();
    if (!item_id) return [];

    return [
      {
        item_id,
        connector_name: asNullableString(item["connector_name"]),
        item_status: asNullableString(item["item_status"]),
        last_sync_at: asNullableString(item["last_sync_at"]),
        last_error: asNullableString(item["last_error"]),
      },
    ];
  });
}

function asRecordOfNumbers(value: unknown): Record<string, number> {
  if (!isObject(value)) return {};

  return Object.entries(value).reduce<Record<string, number>>((acc, [key, item]) => {
    if (typeof item === "number" && Number.isFinite(item)) {
      acc[key] = item;
    }
    return acc;
  }, {});
}

function asMonthlyIncomeExtra(value: unknown): MonthlyIncomeExtra | null {
  if (!isObject(value)) return null;

  const id = asString(value["id"]);
  const description = asString(value["description"]).trim();
  const amount = asNumber(value["amount"], -1);
  if (!id || !description || amount < 0) return null;

  return {
    id,
    description,
    amount,
  };
}

function asRecordOfIncomeExtras(value: unknown): Record<string, MonthlyIncomeExtra[]> {
  if (!isObject(value)) return {};

  return Object.entries(value).reduce<Record<string, MonthlyIncomeExtra[]>>((acc, [key, item]) => {
    if (!Array.isArray(item)) return acc;

    const extras = item.flatMap((entry) => {
      const normalized = asMonthlyIncomeExtra(entry);
      return normalized ? [normalized] : [];
    });

    if (extras.length > 0) {
      acc[key] = extras;
    }

    return acc;
  }, {});
}

function asMonthlySavingsEntry(value: unknown): MonthlySavingsEntry | null {
  if (!isObject(value)) return null;

  const id = asString(value["id"]);
  const description = asString(value["description"]).trim();
  const amount = asNumber(value["amount"], -1);
  const created_at = asString(value["created_at"], SEED_TIMESTAMP);
  if (!id || !description || amount < 0) return null;

  return {
    id,
    description,
    amount,
    created_at,
    already_saved: asBoolean(value["already_saved"], false),
    deduct_from_income: asBoolean(value["deduct_from_income"], false),
  };
}

function asRecordOfSavingsEntries(value: unknown): Record<string, MonthlySavingsEntry[]> {
  if (!isObject(value)) return {};

  return Object.entries(value).reduce<Record<string, MonthlySavingsEntry[]>>((acc, [key, item]) => {
    if (!Array.isArray(item)) return acc;

    const entries = item.flatMap((entry) => {
      const normalized = asMonthlySavingsEntry(entry);
      return normalized ? [normalized] : [];
    });

    if (entries.length > 0) {
      acc[key] = entries;
    }

    return acc;
  }, {});
}

export function normalizeDatabase(input: unknown): Database {
  const base = emptyDatabase();
  if (!isObject(input)) return base;

  const cards = Array.isArray(input["cards"])
    ? input["cards"].flatMap((item): Card[] => {
        if (!isObject(item)) return [];
        const id = asString(item["id"]);
        const name = asString(item["name"]);
        if (!id || !name) return [];

        return [
          {
            id,
            name,
            institution: asNullableString(item["institution"]),
            type:
              item["type"] === "credit" || item["type"] === "debit" || item["type"] === "both"
                ? item["type"]
                : "credit",
            brand:
              item["brand"] === "visa" ||
              item["brand"] === "mastercard" ||
              item["brand"] === "elo" ||
              item["brand"] === "amex" ||
              item["brand"] === "hipercard" ||
              item["brand"] === "nubank" ||
              item["brand"] === "unknown"
                ? item["brand"]
                : null,
            last4: asNullableString(item["last4"]),
            credit_limit: asNullableNumber(item["credit_limit"]),
            closing_day: asNullableNumber(item["closing_day"]),
            due_day: asNullableNumber(item["due_day"]),
            color: asString(item["color"], "#0f766e"),
            active: asBoolean(item["active"], true),
            created_at: asString(item["created_at"], SEED_TIMESTAMP),
            updated_at: asString(item["updated_at"], SEED_TIMESTAMP),
          },
        ];
      })
    : [];

  const categories = Array.isArray(input["categories"])
    ? input["categories"].flatMap((item): Category[] => {
        if (!isObject(item)) return [];
        const id = asString(item["id"]);
        const name = asString(item["name"]);
        if (!id || !name) return [];

        return [
          {
            id,
            name,
            icon: asString(item["icon"], "circle"),
            color: asString(item["color"], "#64748b"),
            active: asBoolean(item["active"], true),
            created_at: asString(item["created_at"], SEED_TIMESTAMP),
            updated_at: asString(item["updated_at"], SEED_TIMESTAMP),
          },
        ];
      })
    : [];

  const expenses = Array.isArray(input["expenses"])
    ? input["expenses"].flatMap((item): Expense[] => {
        if (!isObject(item)) return [];
        const id = asString(item["id"]);
        const description = asString(item["description"]);
        const expense_date = asString(item["expense_date"]);
        const category_id = asString(item["category_id"]);
        if (!id || !description || !expense_date || !category_id) return [];

        const payment_method =
          item["payment_method"] === "credit" ||
          item["payment_method"] === "debit" ||
          item["payment_method"] === "pix" ||
          item["payment_method"] === "cash" ||
          item["payment_method"] === "other"
            ? item["payment_method"]
            : "cash";

        return [
          {
            id,
            description,
            total_amount: asNumber(item["total_amount"]),
            expense_date,
            payment_method,
            card_id: asNullableString(item["card_id"]),
            category_id,
            installment_count: Math.max(1, Math.floor(asNumber(item["installment_count"], 1))),
            notes: asNullableString(item["notes"]),
            created_at: asString(item["created_at"], SEED_TIMESTAMP),
            updated_at: asString(item["updated_at"], SEED_TIMESTAMP),
          },
        ];
      })
    : [];

  const installments = Array.isArray(input["installments"])
    ? input["installments"].flatMap((item): Installment[] => {
        if (!isObject(item)) return [];
        const id = asString(item["id"]);
        const expense_id = asString(item["expense_id"]);
        const competence_month = asString(item["competence_month"]);
        if (!id || !expense_id || !competence_month) return [];

        return [
          {
            id,
            expense_id,
            installment_number: Math.max(1, Math.floor(asNumber(item["installment_number"], 1))),
            installment_count: Math.max(1, Math.floor(asNumber(item["installment_count"], 1))),
            amount: asNumber(item["amount"]),
            competence_month,
            created_at: asString(item["created_at"], SEED_TIMESTAMP),
            updated_at: asString(item["updated_at"], SEED_TIMESTAMP),
          },
        ];
      })
    : [];

  const settings: Settings = isObject(input["settings"])
    ? {
        theme:
          input["settings"]["theme"] === "light" ||
          input["settings"]["theme"] === "dark" ||
          input["settings"]["theme"] === "system"
            ? input["settings"]["theme"]
            : "dark",
        pluggy: isObject(input["settings"]["pluggy"])
          ? {
              item_id: asNullableString(input["settings"]["pluggy"]["item_id"]),
              connector_name: asNullableString(input["settings"]["pluggy"]["connector_name"]),
              item_status: asNullableString(input["settings"]["pluggy"]["item_status"]),
              last_sync_at: asNullableString(input["settings"]["pluggy"]["last_sync_at"]),
              last_error: asNullableString(input["settings"]["pluggy"]["last_error"]),
              proxy_url: asNullableString(input["settings"]["pluggy"]["proxy_url"]),
              items: asPluggyItems(input["settings"]["pluggy"]["items"]),
            }
          : base.settings.pluggy,
        auth: isObject(input["settings"]["auth"])
          ? {
              user_id: asNullableString(input["settings"]["auth"]["user_id"]),
              email: asNullableString(input["settings"]["auth"]["email"]),
              access_token: asNullableString(input["settings"]["auth"]["access_token"]),
              refresh_token: asNullableString(input["settings"]["auth"]["refresh_token"]),
              expires_at: asNullableString(input["settings"]["auth"]["expires_at"]),
              session_active: asBoolean(input["settings"]["auth"]["session_active"], false),
            }
          : base.settings.auth,
        sync: isObject(input["settings"]["sync"])
          ? {
              remote_updated_at: asNullableString(input["settings"]["sync"]["remote_updated_at"]),
              last_local_change_at: asNullableString(
                input["settings"]["sync"]["last_local_change_at"],
              ),
            }
          : base.settings.sync,
        monthly_income_by_month: asRecordOfNumbers(input["settings"]["monthly_income_by_month"]),
        monthly_income_extras_by_month: asRecordOfIncomeExtras(
          input["settings"]["monthly_income_extras_by_month"],
        ),
        monthly_savings_by_month: asRecordOfSavingsEntries(
          input["settings"]["monthly_savings_by_month"],
        ),
      }
    : base.settings;

  return {
    cards,
    categories: categories.length ? categories : base.categories,
    expenses,
    installments,
    settings,
  };
}

export function loadDatabase(): Database {
  if (typeof window === "undefined") return emptyDatabase();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDatabase();
    return normalizeDatabase(JSON.parse(raw));
  } catch {
    return emptyDatabase();
  }
}

export function saveDatabase(db: Database): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* armazenamento indisponivel */
  }
}
