import type { Card, Category, Database } from "./types";

export const STORAGE_KEY = "gastos.db.v1";

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const now = () => new Date().toISOString();

const DEFAULT_CATEGORIES: { name: string; icon: string; color: string }[] = [
  { name: "Alimentação", icon: "utensils", color: "#f97316" },
  { name: "Mercado", icon: "shopping-cart", color: "#16a34a" },
  { name: "Transporte", icon: "car", color: "#0ea5e9" },
  { name: "Moradia", icon: "home", color: "#8b5cf6" },
  { name: "Saúde", icon: "heart-pulse", color: "#ef4444" },
  { name: "Educação", icon: "graduation-cap", color: "#2563eb" },
  { name: "Lazer", icon: "gamepad-2", color: "#ec4899" },
  { name: "Compras", icon: "shopping-bag", color: "#eab308" },
  { name: "Assinaturas", icon: "repeat", color: "#14b8a6" },
  { name: "Viagem", icon: "plane", color: "#06b6d4" },
  { name: "Presentes", icon: "gift", color: "#f43f5e" },
  { name: "Outros", icon: "circle-dashed", color: "#64748b" },
];

export function seedCategories(): Category[] {
  const timestamp = now();
  return DEFAULT_CATEGORIES.map((category) => ({
    id: createId(),
    name: category.name,
    icon: category.icon,
    color: category.color,
    active: true,
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

export function emptyDatabase(): Database {
  return {
    cards: [] as Card[],
    categories: seedCategories(),
    expenses: [],
    installments: [],
    settings: { theme: "system" },
  };
}

export function loadDatabase(): Database {
  if (typeof window === "undefined") return emptyDatabase();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDatabase();
    const parsed = JSON.parse(raw) as Partial<Database>;
    const base = emptyDatabase();
    return {
      cards: parsed.cards ?? [],
      categories: parsed.categories?.length ? parsed.categories : base.categories,
      expenses: parsed.expenses ?? [],
      installments: parsed.installments ?? [],
      settings: { theme: parsed.settings?.theme ?? "system" },
    };
  } catch {
    return emptyDatabase();
  }
}

export function saveDatabase(db: Database): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* armazenamento indisponível */
  }
}
