import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Home,
  Link2,
  Plus,
  RefreshCw,
  Settings,
  Tag,
  Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

import {
  currentMonthKey,
  formatDateBR,
  monthLabel,
  shiftDateISO,
  shiftMonth,
  todayISO,
} from "./src/lib/dates";
import { mergePluggySync, type PluggySyncPayload } from "./src/lib/pluggy";
import { digitsToCents, formatAmount, formatCurrency, parseCurrencyToCents } from "./src/lib/money";
import { expenseSchema } from "./src/lib/schemas";
import {
  buildInstallments,
  cardMonthTotal,
  entriesForMonth,
  normalizeExpenseInput,
  sumEntries,
  totalsByCard,
  totalsByCategory,
  totalsByPaymentMethod,
  type ExpenseInput,
} from "./src/lib/summary";
import { createId, emptyDatabase, normalizeDatabase } from "./src/lib/storage";
import type {
  Card,
  CardBrand,
  Category,
  Database,
  EntryView,
  Expense,
  MonthlyIncomeExtra,
  MonthlySavingsEntry,
  PaymentMethod,
} from "./src/lib/types";
import { PAYMENT_LABELS, PAYMENT_METHODS, requiresCard } from "./src/lib/types";
import logoLogin from "./assets/logo-login.png";

const STORAGE_KEY = "meu-bolso-db.json";
const CARD_COLORS = ["#0f766e", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#334155"];
const CATEGORY_COLORS = ["#f97316", "#16a34a", "#0ea5e9", "#8b5cf6", "#ef4444", "#eab308"];
const CATEGORY_GRADIENT_COLORS = [
  "#f97316",
  "#facc15",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
];
const BRAZILIAN_INSTITUTIONS = [
  "Banco do Brasil",
  "Caixa Economica Federal",
  "Bradesco",
  "Itau",
  "Santander",
  "Nubank",
  "Inter",
  "C6 Bank",
  "BTG Pactual",
  "Original",
  "PicPay",
  "Mercado Pago",
  "PagBank",
  "Sicredi",
  "Sicoob",
  "Safra",
  "Banrisul",
  "Neon",
  "Next",
  "Stone",
  "Outro",
] as const;
const PAYMENT_CHART_COLORS: Record<PaymentMethod, string> = {
  credit: "#8b5cf6",
  debit: "#22c55e",
  pix: "#06b6d4",
  cash: "#f59e0b",
};
const SCREEN_WIDTH = Dimensions.get("window").width;
const UI_SCALE = Math.min(Math.max(SCREEN_WIDTH / 390, 0.9), 1);
const scale = (value: number) => Math.round(value * UI_SCALE);

type TabKey = "home" | "expenses" | "cards" | "categories" | "savings";

type ExpenseDraft = {
  description: string;
  amountText: string;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  cardId: string | null;
  categoryId: string;
  installmentCount: string;
  recurrenceType: "once" | "week" | "month" | "year" | "installment";
  recurrenceCount: string;
  notes: string;
};

type CardDraft = {
  name: string;
  institution: string;
  type: "credit" | "debit" | "both";
  cardNumber: string;
  creditLimit: string;
  closingDay: string;
  dueDay: string;
};

type CategoryDraft = {
  name: string;
  color: string;
};

type IncomeExtraDraft = {
  id: string;
  description: string;
  amountText: string;
};

type SavingsDraft = {
  description: string;
  amountText: string;
  alreadySaved: boolean;
  deductFromIncome: boolean;
};

type MainAppState = {
  db: Database;
  hydrated: boolean;
};

type PluggyProxyConfigStatus = {
  configured: boolean;
  clientIdMasked: string | null;
  apiUrl?: string;
  webhookConfigured?: boolean;
  webhookUrl?: string | null;
  webhookReady?: boolean;
};

type PluggyPersistedAccountSummary = {
  nome: string;
  tipo: string;
  saldoAtual: number;
  instituicao?: string | null;
};

type PluggyPersistedCardSummary = {
  nome: string;
  saldoAtual: number;
  limiteTotal: number;
  ultimosQuatroDigitos?: string | null;
};

type PluggyPersistedConnectionSummary = {
  id: string;
  itemId: string;
  status: string;
  lastError: string | null;
  lastSyncAt: string | null;
  updatedAt: string | null;
  integrationStatus: string | null;
  accounts: PluggyPersistedAccountSummary[];
  cards: PluggyPersistedCardSummary[];
  transactionsCount: number;
};

type AuthMode = "login" | "register";

type PluggyConnectProps = {
  connectToken: string;
  itemId?: string;
  selectedConnectorId?: number;
  onClose?: () => void;
  onError?: (error: { message?: string; data?: { item?: { id?: string } } }) => void;
  onSuccess?: (payload: {
    item: {
      id: string;
      status?: string;
      executionStatus?: string;
      connector?: { name?: string | null } | null;
    };
  }) => void;
};

type PluggyConnectComponent = React.ComponentType<PluggyConnectProps>;
type PaymentChartItem = {
  key: PaymentMethod;
  label: string;
  value: number;
  percentage: number;
  color: string;
};

type ResolvedTheme = "light" | "dark";
type ScreenKey = TabKey | "config";

const lightColors = {
  background: "#f6f4ea",
  card: "#ffffff",
  primary: "#479a7f",
  primarySoft: "#dcece3",
  primaryText: "#214f41",
  textStrong: "#1f3a31",
  textMuted: "#73857d",
  borderSoft: "#e3dfd2",
  monthCard: "#f1eee4",
  monthCardBorder: "#e1dbc9",
  chipBg: "#f1eee4",
  chipBorder: "#e0dacc",
  chipText: "#365b4f",
  chipActiveBg: "#dcece3",
  chipActiveBorder: "#4c9d83",
  chipActiveText: "#214f41",
  floatingBg: "#7c3aed",
  floatingText: "#f7f3ff",
};

const darkColors = {
  background: "#050505",
  card: "#101010",
  primary: "#f4f4f5",
  primarySoft: "#1a1a1a",
  primaryText: "#050505",
  textStrong: "#fafafa",
  textMuted: "#a1a1aa",
  borderSoft: "#262626",
  monthCard: "#111111",
  monthCardBorder: "#202020",
  chipBg: "#111111",
  chipBorder: "#2a2a2a",
  chipText: "#e4e4e7",
  chipActiveBg: "#1a1a1a",
  chipActiveBorder: "#52525b",
  chipActiveText: "#fafafa",
  floatingBg: "#7c3aed",
  floatingText: "#f7f3ff",
};

const webDonutShellStyle: React.CSSProperties = {
  position: "relative",
  width: `${scale(76)}px`,
  height: `${scale(76)}px`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const webDonutRingStyle: React.CSSProperties = {
  width: `${scale(76)}px`,
  height: `${scale(76)}px`,
  borderRadius: "9999px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const webDonutHoleStyle: React.CSSProperties = {
  width: `${scale(58)}px`,
  height: `${scale(58)}px`,
  borderRadius: "9999px",
  background: "#101010",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  textAlign: "center",
};

const stylesWeb = {
  donutCenterLabel: {
    color: "#a1a1aa",
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    fontSize: `${scale(8.5)}px`,
    fontWeight: 600,
    lineHeight: 1.1,
  } satisfies React.CSSProperties,
  donutCenterValue: {
    color: "#fafafa",
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    fontSize: `${scale(13.5)}px`,
    fontWeight: 700,
    lineHeight: 1.1,
    marginTop: "1px",
  } satisfies React.CSSProperties,
  donutHitArea: {
    position: "absolute",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    outline: "none",
    padding: 0,
    appearance: "none",
    WebkitTapHighlightColor: "transparent",
    borderRadius: "9999px",
  } satisfies React.CSSProperties,
  donutHitAreaActive: {
    background: "rgba(255,255,255,0.05)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
  } satisfies React.CSSProperties,
  donutHitTop: {
    top: "-4%",
    left: "8%",
    width: "84%",
    height: "42%",
  } satisfies React.CSSProperties,
  donutHitRight: {
    top: "8%",
    right: "-4%",
    width: "42%",
    height: "84%",
  } satisfies React.CSSProperties,
  donutHitBottom: {
    bottom: "-4%",
    left: "8%",
    width: "84%",
    height: "42%",
  } satisfies React.CSSProperties,
  donutHitLeft: {
    top: "8%",
    left: "-4%",
    width: "42%",
    height: "84%",
  } satisfies React.CSSProperties,
};

function makeExpenseDraft(categories: Category[]): ExpenseDraft {
  return {
    description: "",
    amountText: "",
    expenseDate: todayISO(),
    paymentMethod: "pix",
    cardId: null,
    categoryId: categories[0]?.id ?? "",
    installmentCount: "1",
    recurrenceType: "once",
    recurrenceCount: "1",
    notes: "",
  };
}

function makeCardDraft(): CardDraft {
  return {
    name: "",
    institution: "",
    type: "credit",
    cardNumber: "",
    creditLimit: "",
    closingDay: "",
    dueDay: "",
  };
}

function makeCategoryDraft(categories: Category[]): CategoryDraft {
  return {
    name: "",
    color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length] ?? "#16a34a",
  };
}

function parseIntOrNull(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function maskCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  return digits ? formatAmount(digitsToCents(digits)) : "";
}

function maskCardNumberInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatCurrencyInputFromCents(value: number): string {
  return value > 0 ? formatCurrency(value).replace("R$ ", "") : "";
}

function makeIncomeExtraDraft(extra?: MonthlyIncomeExtra): IncomeExtraDraft {
  return {
    id: extra?.id ?? createId(),
    description: extra?.description ?? "",
    amountText: extra ? formatCurrencyInputFromCents(extra.amount) : "",
  };
}

function makeSavingsDraft(): SavingsDraft {
  return {
    description: "",
    amountText: "",
    alreadySaved: false,
    deductFromIncome: false,
  };
}

function formatHexColorInput(value: string): string {
  const digits = value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase();
  return digits ? `#${digits}` : "#";
}

function normalizeHexColor(value: string): string | null {
  const digits = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(digits)) {
    return `#${digits
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase()}`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(digits)) {
    return `#${digits.toUpperCase()}`;
  }

  return null;
}

function getCardNumberDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function detectCardBrandFromNumber(value: string): CardBrand | null {
  const digits = getCardNumberDigits(value);
  if (!digits) return null;

  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(digits)) return "visa";
  if (/^(5[1-5]\d{14}|2(2[2-9]|[3-6]\d|7[01]|720)\d{12})$/.test(digits)) return "mastercard";
  if (/^(4011|4312|4389)\d{12,15}$/.test(digits)) return "elo";
  if (/^(34|37)\d{13}$/.test(digits)) return "amex";
  if (/^(6062|3841)\d{12,15}$/.test(digits)) return "hipercard";
  if (/^40117\d{11,14}$/.test(digits)) return "nubank";
  return "unknown";
}

function isValidCardNumber(value: string): boolean {
  const digits = getCardNumberDigits(value);
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number.parseInt(digits[index] || "0", 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function getDetectedCardBrandLabel(brand: CardBrand | null): string | null {
  switch (brand) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "elo":
      return "Elo";
    case "amex":
      return "American Express";
    case "hipercard":
      return "Hipercard";
    case "nubank":
      return "Nubank";
    case "unknown":
      return "Bandeira nao identificada";
    default:
      return null;
  }
}

function expenseInputFromDraft(draft: ExpenseDraft): ExpenseInput {
  return {
    description: draft.description.trim(),
    total_amount: parseCurrencyToCents(draft.amountText),
    expense_date: draft.expenseDate,
    payment_method: draft.recurrenceType === "installment" ? "credit" : draft.paymentMethod,
    card_id: draft.cardId,
    category_id: draft.categoryId,
    installment_count: Math.max(
      1,
      Number.parseInt(
        draft.recurrenceType === "installment"
          ? draft.recurrenceCount
          : draft.installmentCount || "1",
        10,
      ) || 1,
    ),
    notes: draft.notes.trim() || null,
  };
}

function notify(title: string, message: string) {
  if (typeof alert === "function") {
    alert(`${title}\n\n${message}`);
  }
}

function humanizePluggyError(message: string): string {
  if (message === "TRIAL_CLIENT_ITEM_CREATE_NOT_ALLOWED") {
    return "Sua aplicacao Pluggy atual nao tem permissao para conectar contas reais. Habilite live/producao na Pluggy.";
  }

  if (
    message.includes("Requiring unknown module") ||
    message.includes("Metro") ||
    message.includes("yarn") ||
    message.includes("npm install")
  ) {
    return "Nao foi possivel abrir integracao bancaria neste aparelho agora. Tente novamente em alguns instantes.";
  }

  return message;
}

function isLocalBrowserHost(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1"
  );
}

function defaultPluggyBackendBaseUrl(): string {
  const envBackendUrl =
    typeof import.meta !== "undefined" &&
    typeof import.meta.env?.VITE_PLUGGY_BACKEND_URL === "string" &&
    import.meta.env.VITE_PLUGGY_BACKEND_URL.trim()
      ? import.meta.env.VITE_PLUGGY_BACKEND_URL.trim().replace(/\/$/, "")
      : null;

  if (envBackendUrl) return envBackendUrl;
  if (typeof window === "undefined") return "http://localhost:3000";
  if (isLocalBrowserHost()) {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return window.location.origin;
}

function resolveTheme(
  theme: Database["settings"]["theme"],
  systemTheme: ResolvedTheme,
): ResolvedTheme {
  return theme === "system" ? systemTheme : theme;
}

function modalInputStyle(colors: typeof lightColors) {
  return {
    backgroundColor: colors.card,
    borderColor: colors.borderSoft,
    color: colors.textStrong,
  } as const;
}

async function readDatabase(): Promise<Database> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return emptyDatabase();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeDatabase(JSON.parse(raw)) : emptyDatabase();
  }

  const { File, Paths } = await import("expo-file-system");
  const file = new File(Paths.document, STORAGE_KEY);
  const raw = await file.text();
  return raw.trim() ? normalizeDatabase(JSON.parse(raw)) : emptyDatabase();
}

async function writeDatabase(db: Database): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    }
    return;
  }

  const { File, Paths } = await import("expo-file-system");
  const file = new File(Paths.document, STORAGE_KEY);
  await file.create({ intermediates: true, overwrite: true });
  await file.write(JSON.stringify(db));
}

function makeCard(input: CardDraft, index: number): Card {
  const now = new Date().toISOString();
  const digits = getCardNumberDigits(input.cardNumber);
  const brand = detectCardBrandFromNumber(digits);
  return {
    id: createId(),
    name: input.name.trim(),
    institution: input.institution.trim() || null,
    type: input.type,
    brand,
    last4: digits ? digits.slice(-4) : null,
    credit_limit: parseCurrencyToCents(input.creditLimit) || null,
    closing_day: parseIntOrNull(input.closingDay),
    due_day: parseIntOrNull(input.dueDay),
    color: CARD_COLORS[index % CARD_COLORS.length] ?? "#0f766e",
    active: true,
    created_at: now,
    updated_at: now,
  };
}

function makeCategory(input: CategoryDraft): Category {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name: input.name.trim(),
    icon: "circle",
    color: input.color,
    active: true,
    created_at: now,
    updated_at: now,
  };
}

function addExpenseToDb(db: Database, input: ExpenseInput): Database {
  const now = new Date().toISOString();
  const normalized = normalizeExpenseInput(input);
  const expense: Expense = {
    id: createId(),
    ...normalized,
    created_at: now,
    updated_at: now,
  };

  return {
    ...db,
    expenses: [...db.expenses, expense],
    installments: [...db.installments, ...buildInstallments(expense)],
  };
}

function removeExpenseFromDb(db: Database, expenseId: string): Database {
  return {
    ...db,
    expenses: db.expenses.filter((expense) => expense.id !== expenseId),
    installments: db.installments.filter((installment) => installment.expense_id !== expenseId),
  };
}

function removeCardFromDb(db: Database, cardId: string): Database {
  return {
    ...db,
    cards: db.cards.filter((card) => card.id !== cardId),
    expenses: db.expenses.map((expense) =>
      expense.card_id === cardId ? { ...expense, card_id: null } : expense,
    ),
  };
}

function removeCategoryFromDb(db: Database, categoryId: string): Database {
  return {
    ...db,
    categories: db.categories.filter((category) => category.id !== categoryId),
  };
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.container, styles.centered, { padding: 24 }]}>
            <Text style={styles.headerTitle}>Meu Bolso</Text>
            <Text style={[styles.sectionSubtitle, { textAlign: "center", marginTop: 12 }]}>
              Erro ao renderizar interface.
            </Text>
            <Text style={[styles.emptyText, { textAlign: "center", marginTop: 8 }]}>
              {this.state.error.message}
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <MainApp />
    </AppErrorBoundary>
  );
}

function MainApp() {
  const systemTheme = useColorScheme() === "dark" ? "dark" : "light";
  const [state, setState] = useState<MainAppState>({ db: emptyDatabase(), hydrated: false });
  const [pluggyComponent, setPluggyComponent] = useState<PluggyConnectComponent | null>(null);
  const [pluggyBackendUrlDraft, setPluggyBackendUrlDraft] = useState("");
  const [pluggyConfigStatus, setPluggyConfigStatus] = useState<PluggyProxyConfigStatus>({
    configured: false,
    clientIdMasked: null,
  });
  const [pluggyConnections, setPluggyConnections] = useState<PluggyPersistedConnectionSummary[]>(
    [],
  );
  const [pluggyConnectToken, setPluggyConnectToken] = useState<string | null>(null);
  const [pluggyWidgetItemId, setPluggyWidgetItemId] = useState<string | undefined>(undefined);
  const [pluggySelectedConnectorId, setPluggySelectedConnectorId] = useState<number | undefined>(
    undefined,
  );
  const [pluggyBusy, setPluggyBusy] = useState(false);
  const [month, setMonth] = useState(currentMonthKey());
  const [tab, setTab] = useState<TabKey>("home");
  const [screen, setScreen] = useState<ScreenKey>("home");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "all">("all");
  const [incomeBaseDraft, setIncomeBaseDraft] = useState("");
  const [incomeExtraDrafts, setIncomeExtraDrafts] = useState<IncomeExtraDraft[]>([]);
  const [savingsDraft, setSavingsDraft] = useState<SavingsDraft>(makeSavingsDraft);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(() =>
    makeExpenseDraft(emptyDatabase().categories),
  );
  const [cardDraft, setCardDraft] = useState<CardDraft>(makeCardDraft);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(() =>
    makeCategoryDraft(emptyDatabase().categories),
  );
  const [authEmailDraft, setAuthEmailDraft] = useState("");
  const [authPasswordDraft, setAuthPasswordDraft] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const db = await readDatabase();
        if (active) {
          setState({ db, hydrated: true });
          setPluggyBackendUrlDraft(db.settings.pluggy.proxy_url || defaultPluggyBackendBaseUrl());
        }
      } catch {
        if (active) {
          setState({ db: emptyDatabase(), hydrated: true });
          setPluggyBackendUrlDraft(defaultPluggyBackendBaseUrl());
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    void writeDatabase(state.db);
  }, [state]);

  useEffect(() => {
    if (!state.hydrated || Platform.OS !== "web") return;
    void loadPluggyProxyConfigStatus();
  }, [state.hydrated, state.db.settings.pluggy.proxy_url]);

  useEffect(() => {
    if (!state.hydrated || Platform.OS !== "web") return;
    if (!state.db.settings.auth.email) {
      setPluggyConnections([]);
      return;
    }
    void loadPluggyConnections();
  }, [state.hydrated, state.db.settings.auth.email, state.db.settings.pluggy.proxy_url]);

  useEffect(() => {
    setExpenseDraft((current) =>
      current.categoryId
        ? current
        : { ...current, categoryId: state.db.categories[0]?.id ?? "", cardId: null },
    );
    setCategoryDraft((current) =>
      current.name ? current : makeCategoryDraft(state.db.categories),
    );
  }, [state.db.categories]);

  useEffect(() => {
    if (state.db.settings.auth.email) {
      setAuthEmailDraft(state.db.settings.auth.email);
    }
  }, [state.db.settings.auth.email]);

  const monthEntries = useMemo(
    () =>
      entriesForMonth(
        month,
        state.db.expenses,
        state.db.installments,
        state.db.cards,
        state.db.categories,
      ),
    [month, state.db],
  );

  const filteredEntries = useMemo(
    () =>
      monthEntries
        .filter((entry) => {
          if (methodFilter !== "all" && entry.expense.payment_method !== methodFilter) {
            return false;
          }
          if (
            search &&
            !entry.expense.description.toLowerCase().includes(search.trim().toLowerCase())
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.expense.expense_date.localeCompare(a.expense.expense_date)),
    [methodFilter, monthEntries, search],
  );

  const latestEntries = useMemo(
    () =>
      [...monthEntries]
        .sort((a, b) => b.expense.created_at.localeCompare(a.expense.created_at))
        .slice(0, 5),
    [monthEntries],
  );

  const totalMonth = sumEntries(monthEntries);
  const totals = totalsByPaymentMethod(monthEntries);
  const monthlyBaseIncome = state.db.settings.monthly_income_by_month[month] ?? 0;
  const monthlyIncomeExtras = state.db.settings.monthly_income_extras_by_month[month] ?? [];
  const monthlySavingsEntries = state.db.settings.monthly_savings_by_month[month] ?? [];
  const monthlySavingsTotal = monthlySavingsEntries.reduce((sum, item) => sum + item.amount, 0);
  const monthlySavingsFromIncome = monthlySavingsEntries.reduce(
    (sum, item) => sum + (item.deduct_from_income ? item.amount : 0),
    0,
  );
  const monthlyIncome = monthlyBaseIncome + monthlyIncomeExtras.reduce((sum, item) => sum + item.amount, 0);
  const theme = resolveTheme(state.db.settings.theme, systemTheme);
  const colors = theme === "dark" ? darkColors : lightColors;
  const pluggySettings = state.db.settings.pluggy;
  const authSettings = state.db.settings.auth;
  const hasAccess = Boolean(authSettings.email && authSettings.password);
  const authMode: AuthMode = hasAccess ? "login" : "register";

  const primaryActionLabel =
    tab === "cards"
      ? "+ Novo cartao"
      : tab === "categories"
        ? "+ Nova categoria"
        : tab === "savings"
          ? "+ Guardar dinheiro"
          : "+ Novo gasto";

  function updateDb(updater: (db: Database) => Database) {
    setState((current) => ({ ...current, db: updater(current.db) }));
  }

  function setThemeMode(nextTheme: Database["settings"]["theme"]) {
    updateDb((db) => ({
      ...db,
      settings: { ...db.settings, theme: nextTheme },
    }));
  }

  function setPluggySettings(
    updater: (current: Database["settings"]["pluggy"]) => Database["settings"]["pluggy"],
  ) {
    updateDb((db) => ({
      ...db,
      settings: {
        ...db.settings,
        pluggy: updater(db.settings.pluggy),
      },
    }));
  }

  function handleAuthSubmit() {
    const email = authEmailDraft.trim().toLowerCase();
    const password = authPasswordDraft.trim();

    if (!email || !password) {
      notify("Login", "Informe e-mail e senha.");
      return;
    }

    if (authMode === "register") {
      updateDb((db) => ({
        ...db,
        settings: {
          ...db.settings,
          auth: {
            email,
            password,
            session_active: true,
          },
        },
      }));
      setAuthPasswordDraft("");
      return;
    }

    if (email !== authSettings.email || password !== authSettings.password) {
      notify("Login", "E-mail ou senha invalidos.");
      return;
    }

    updateDb((db) => ({
      ...db,
      settings: {
        ...db.settings,
        auth: {
          ...db.settings.auth,
          session_active: true,
        },
      },
    }));
    setAuthPasswordDraft("");
  }

  function handleLogout() {
    updateDb((db) => ({
      ...db,
      settings: {
        ...db.settings,
        auth: {
          ...db.settings.auth,
          session_active: false,
        },
      },
    }));
    setAuthEmailDraft(authSettings.email ?? "");
    setAuthPasswordDraft("");
    setScreen("home");
    setTab("home");
  }

  async function requestPluggyApi<T>(
    path: string,
    options?: {
      method?: "GET" | "POST";
      body?: Record<string, unknown>;
    },
  ) {
    const configuredBaseUrl = (
      state.db.settings.pluggy.proxy_url || defaultPluggyBackendBaseUrl()
    ).replace(/\/$/, "");
    const candidateBaseUrls = [configuredBaseUrl];

    if (
      typeof window !== "undefined" &&
      window.location.origin &&
      window.location.origin !== configuredBaseUrl
    ) {
      candidateBaseUrls.push(window.location.origin);
    }

    if (isLocalBrowserHost() && configuredBaseUrl !== "http://localhost:3000") {
      candidateBaseUrls.push("http://localhost:3000");
    }

    let lastError: Error | null = null;
    const method = options?.method ?? "POST";
    const userEmail = state.db.settings.auth.email?.trim().toLowerCase() || null;
    const requiresUserEmail = path !== "/api/pluggy/config/status" && path !== "/api/pluggy/webhook/ensure";

    if (requiresUserEmail && !userEmail) {
      throw new Error("Faca login no app antes de usar a integracao Pluggy.");
    }

    for (const baseUrl of candidateBaseUrls) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (userEmail) {
          headers["X-User-Email"] = userEmail;
        }

        const response = await fetch(`${baseUrl}${path}`, {
          method,
          headers,
          ...(method === "POST" ? { body: JSON.stringify(options?.body || {}) } : {}),
        });
        const payload = (await response.json()) as {
          sucesso?: boolean;
          dados?: T;
          error?: string;
          erro?: string;
        };
        if (!response.ok || payload.error || payload.erro) {
          throw new Error(payload.error || payload.erro || `Erro Pluggy ${response.status}`);
        }
        return (payload.dados ?? payload) as T;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error("Falha ao conectar no backend Pluggy");
      }
    }

    throw new Error(
      lastError?.message === "Failed to fetch"
        ? "Backend Pluggy offline. Inicie o backend em `http://localhost:3000` ou publique `/api/pluggy` no mesmo dominio do app."
        : (lastError?.message ?? "Falha ao conectar no backend Pluggy"),
    );
  }

  async function loadPluggyProxyConfigStatus() {
    try {
      const payload = await requestPluggyApi<PluggyProxyConfigStatus>(
        "/api/pluggy/config/status",
        { method: "POST", body: {} },
      );
      setPluggyConfigStatus(payload);
    } catch {
      setPluggyConfigStatus({ configured: false, clientIdMasked: null });
    }
  }

  async function loadPluggyConnections() {
    try {
      const payload = await requestPluggyApi<{ usuarioId: string; conexoes: PluggyPersistedConnectionSummary[] }>(
        "/api/pluggy/conexoes",
        { method: "GET" },
      );
      setPluggyConnections(payload.conexoes ?? []);
    } catch {
      setPluggyConnections([]);
    }
  }

  function savePluggyBackendUrl() {
    const nextUrl = pluggyBackendUrlDraft.trim().replace(/\/$/, "");
    if (!nextUrl) {
      notify("Pluggy", "Preencha a URL do backend Pluggy.");
      return;
    }
    setPluggySettings((current) => ({
      ...current,
      proxy_url: nextUrl,
    }));
    notify("Pluggy", "URL do backend Pluggy salva neste dispositivo.");
  }

  async function loadPluggyWidget() {
    if (pluggyComponent) return pluggyComponent;
    const module = (await import("react-pluggy-connect")) as {
      PluggyConnect: PluggyConnectComponent;
    };
    setPluggyComponent(() => module.PluggyConnect);
    return module.PluggyConnect;
  }

  async function openPluggyConnect(itemId?: string, selectedConnectorId?: number) {
    if (Platform.OS !== "web") {
      notify("Pluggy", "Fluxo Pluggy habilitado no navegador web via backend.");
      return;
    }

    try {
      setPluggyBusy(true);
      await loadPluggyWidget();
      const token = await requestPluggyApi<{ accessToken: string }>("/api/pluggy/connect-token", {
        method: "POST",
        body: {
          itemId,
          options: {
            avoidDuplicates: true,
          },
        },
      });
      setPluggyWidgetItemId(itemId);
      setPluggySelectedConnectorId(selectedConnectorId);
      setPluggyConnectToken(token.accessToken);
      setScreen("config");
    } catch (error) {
      setPluggySettings((current) => ({
        ...current,
        last_error:
          error instanceof Error
            ? humanizePluggyError(error.message)
            : "Falha ao abrir Pluggy Connect",
      }));
      notify(
        "Pluggy",
        error instanceof Error
          ? humanizePluggyError(error.message)
          : "Falha ao abrir Pluggy Connect",
      );
    } finally {
      setPluggyBusy(false);
    }
  }

  async function syncPluggyData(itemIdOverride?: string) {
    const itemId = itemIdOverride || state.db.settings.pluggy.item_id;
    if (!itemId) {
      notify("Pluggy", "Conecte conta primeiro.");
      return;
    }

    try {
      setPluggyBusy(true);
      const payload = await requestPluggyApi<PluggySyncPayload>("/api/pluggy/sync", {
        method: "POST",
        body: { itemId },
      });
      const merged = mergePluggySync(state.db, payload);
      setState({
        db: {
          ...merged.db,
          settings: {
            ...merged.db.settings,
            pluggy: {
              ...merged.db.settings.pluggy,
              item_id: payload.item.id,
              connector_name: payload.item.connector?.name ?? null,
              item_status: payload.item.executionStatus ?? payload.item.status ?? null,
              last_sync_at: new Date().toISOString(),
              last_error: null,
            },
          },
        },
        hydrated: true,
      });
      if (merged.latestImportedMonth) {
        setMonth(merged.latestImportedMonth);
        setTab("expenses");
        setScreen("expenses");
      }
      void loadPluggyConnections();
      notify("Pluggy", `${merged.importedCount} gasto(s) importado(s).`);
    } catch (error) {
      setPluggySettings((current) => ({
        ...current,
        last_error:
          error instanceof Error
            ? humanizePluggyError(error.message)
            : "Falha na sincronizacao Pluggy",
      }));
      notify(
        "Pluggy",
        error instanceof Error
          ? humanizePluggyError(error.message)
          : "Falha na sincronizacao Pluggy",
      );
    } finally {
      setPluggyBusy(false);
    }
  }

  function exportBackup() {
    if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined") {
      notify("Backup", "Exportacao disponivel no navegador.");
      return;
    }

    const data = {
      exported_at: new Date().toISOString(),
      months: Object.fromEntries(
        Object.entries(
          state.db.installments.reduce<Record<string, Array<Record<string, unknown>>>>(
            (acc, installment) => {
              const expense = state.db.expenses.find((item) => item.id === installment.expense_id);
              if (!expense) return acc;

              const month = installment.competence_month;
              const category =
                state.db.categories.find((item) => item.id === expense.category_id)?.name ?? null;
              const card = state.db.cards.find((item) => item.id === expense.card_id)?.name ?? null;

              if (!acc[month]) acc[month] = [];
              acc[month]!.push({
                date: expense.expense_date,
                description: expense.description,
                amount: installment.amount,
                total_amount: expense.total_amount,
                payment_method: expense.payment_method,
                category,
                card,
                installment:
                  expense.installment_count > 1
                    ? `${installment.installment_number}/${installment.installment_count}`
                    : null,
                notes: expense.notes ?? null,
              });

              return acc;
            },
            {},
          ),
        )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, entries]) => [
            month,
            entries.sort((a, b) => String(a.date).localeCompare(String(b.date))),
          ]),
      ),
    };

    const reportHtml = `
      <html>
        <head>
          <title>Relatorio de gastos por mes</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            .meta { margin-bottom: 24px; color: #555; font-size: 12px; }
            .month { margin: 24px 0 12px; page-break-inside: avoid; }
            .month h2 { margin: 0 0 12px; font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f5f5f5; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Relatorio de gastos por mes</h1>
          <div class="meta">Gerado em ${new Date(data.exported_at).toLocaleString("pt-BR")}</div>
          ${Object.entries(data.months)
            .map(
              ([month, entries]) => `
                <section class="month">
                  <h2>${month}</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Descricao</th>
                        <th>Valor</th>
                        <th>Pagamento</th>
                        <th>Categoria</th>
                        <th>Cartao</th>
                        <th>Parcela</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(entries as Array<Record<string, unknown>>)
                        .map(
                          (entry) => `
                            <tr>
                              <td>${String(entry.date ?? "")}</td>
                              <td>${String(entry.description ?? "")}</td>
                              <td>${Number(entry.amount ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                              <td>${String(entry.payment_method ?? "")}</td>
                              <td>${String(entry.category ?? "-")}</td>
                              <td>${String(entry.card ?? "-")}</td>
                              <td>${String(entry.installment ?? "-")}</td>
                            </tr>
                          `,
                        )
                        .join("")}
                    </tbody>
                  </table>
                </section>
              `,
            )
            .join("")}
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) {
      notify("Backup", "Permita pop-up para exportar em PDF.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handlePrimaryAction() {
    if (tab === "cards") {
      setShowCardModal(true);
      return;
    }
    if (tab === "categories") {
      setShowCategoryModal(true);
      return;
    }
    if (tab === "savings") {
      setSavingsDraft(makeSavingsDraft());
      setShowSavingsModal(true);
      return;
    }

    setExpenseDraft(makeExpenseDraft(state.db.categories));
    setShowExpenseModal(true);
  }

  function saveExpense() {
    const payload = expenseInputFromDraft(expenseDraft);
    const result = expenseSchema.safeParse(payload);
    if (!result.success) {
      notify("Dados invalidos", result.error.issues[0]?.message ?? "Revise formulario.");
      return;
    }

    const recurrenceCount = Math.max(
      1,
      Number.parseInt(expenseDraft.recurrenceCount || "1", 10) || 1,
    );

    updateDb((db) => {
      if (expenseDraft.recurrenceType === "once" || expenseDraft.recurrenceType === "installment") {
        return addExpenseToDb(db, result.data);
      }

      const mode =
        expenseDraft.recurrenceType === "week"
          ? "week"
          : expenseDraft.recurrenceType === "month"
            ? "month"
            : "year";

      let nextDb = db;
      for (let index = 0; index < recurrenceCount; index += 1) {
        nextDb = addExpenseToDb(nextDb, {
          ...result.data,
          expense_date: shiftDateISO(result.data.expense_date, mode, index),
          installment_count: 1,
        });
      }
      return nextDb;
    });
    setExpenseDraft(makeExpenseDraft(state.db.categories));
    setShowExpenseModal(false);
  }

  function saveCard() {
    if (!cardDraft.name.trim()) {
      notify("Dados invalidos", "Informe nome do cartao.");
      return;
    }

    if (cardDraft.cardNumber.trim() && !isValidCardNumber(cardDraft.cardNumber)) {
      notify("Dados invalidos", "Numero do cartao invalido.");
      return;
    }

    updateDb((db) => ({ ...db, cards: [...db.cards, makeCard(cardDraft, db.cards.length)] }));
    setCardDraft(makeCardDraft());
    setShowCardModal(false);
  }

  function saveCategory() {
    if (!categoryDraft.name.trim()) {
      notify("Dados invalidos", "Informe nome da categoria.");
      return;
    }

    const normalizedColor = normalizeHexColor(categoryDraft.color);
    if (!normalizedColor) {
      notify("Dados invalidos", "Informe cor hex valida. Ex.: #22C55E.");
      return;
    }

    updateDb((db) => ({
      ...db,
      categories: [...db.categories, makeCategory({ ...categoryDraft, color: normalizedColor })],
    }));
    setCategoryDraft(makeCategoryDraft(state.db.categories));
    setShowCategoryModal(false);
  }

  function openIncomeModal() {
    setIncomeBaseDraft(formatCurrencyInputFromCents(monthlyBaseIncome));
    setIncomeExtraDrafts(monthlyIncomeExtras.map((item) => makeIncomeExtraDraft(item)));
    setShowIncomeModal(true);
  }

  function saveMonthlyIncome() {
    const parsedBaseIncome = Math.max(0, parseCurrencyToCents(incomeBaseDraft) ?? 0);
    const hasInvalidExtra = incomeExtraDrafts.some((item) => {
      const description = item.description.trim();
      const amount = parseCurrencyToCents(item.amountText) ?? 0;
      return (description && amount <= 0) || (!description && amount > 0);
    });

    if (hasInvalidExtra) {
      notify("Dados invalidos", "Cada renda extra precisa de descricao e valor.");
      return;
    }

    const normalizedExtras = incomeExtraDrafts.flatMap((item) => {
      const description = item.description.trim();
      const amount = Math.max(0, parseCurrencyToCents(item.amountText) ?? 0);
      if (!description || amount <= 0) return [];

      return [
        {
          id: item.id,
          description,
          amount,
        } satisfies MonthlyIncomeExtra,
      ];
    });

    updateDb((db) => ({
      ...db,
      settings: {
        ...db.settings,
        monthly_income_by_month:
          parsedBaseIncome > 0
            ? { ...db.settings.monthly_income_by_month, [month]: parsedBaseIncome }
            : Object.fromEntries(
                Object.entries(db.settings.monthly_income_by_month).filter(
                  ([entryMonth]) => entryMonth !== month,
                ),
              ),
        monthly_income_extras_by_month:
          normalizedExtras.length > 0
            ? { ...db.settings.monthly_income_extras_by_month, [month]: normalizedExtras }
            : Object.fromEntries(
                Object.entries(db.settings.monthly_income_extras_by_month).filter(
                  ([entryMonth]) => entryMonth !== month,
                ),
              ),
      },
    }));
    setShowIncomeModal(false);
  }

  function saveSavingsEntry() {
    const description = savingsDraft.description.trim();
    const amount = Math.max(0, parseCurrencyToCents(savingsDraft.amountText) ?? 0);

    if (!description) {
      notify("Dados invalidos", "Informe descricao para valor guardado.");
      return;
    }

    if (amount <= 0) {
      notify("Dados invalidos", "Informe valor valido para guardar.");
      return;
    }

    const entry: MonthlySavingsEntry = {
      id: createId(),
      description,
      amount,
      created_at: new Date().toISOString(),
      already_saved: savingsDraft.alreadySaved,
      deduct_from_income: savingsDraft.deductFromIncome,
    };

    updateDb((db) => ({
      ...db,
      settings: {
        ...db.settings,
        monthly_savings_by_month: {
          ...db.settings.monthly_savings_by_month,
          [month]: [entry, ...(db.settings.monthly_savings_by_month[month] ?? [])],
        },
      },
    }));
    setSavingsDraft(makeSavingsDraft());
    setShowSavingsModal(false);
  }

  const isIOSPwaWeb =
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const iosSafeBottom = "env(safe-area-inset-bottom)";
  const iosSafeTop = "env(safe-area-inset-top)";
  const iosPwaFooterInset = `max(0px, calc(${iosSafeBottom} - 18px))`;
  const RootShell = isIOSPwaWeb ? View : SafeAreaView;
  const iosPwaRootStyle = isIOSPwaWeb
    ? ({
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        paddingTop: iosSafeTop,
        paddingBottom: 0,
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        overflow: "hidden",
        backgroundColor: "#050505",
      } as React.CSSProperties)
    : null;
  const iosPwaContainerStyle = isIOSPwaWeb
    ? ({
        height: "100%",
        minHeight: "100%",
        overflow: "hidden",
        backgroundColor: "#050505",
      } as React.CSSProperties)
    : null;
  const iosPwaTabRowStyle = isIOSPwaWeb
    ? ({
        bottom: 0,
        paddingBottom: iosPwaFooterInset,
        backgroundColor: "#050505",
      } as React.CSSProperties)
    : null;
  const iosPwaTabRowInnerStyle = isIOSPwaWeb
    ? ({
        minHeight: scale(62),
        paddingBottom: scale(6),
        paddingTop: scale(4),
      } as React.CSSProperties)
    : null;
  const iosPwaScrollContentStyle = isIOSPwaWeb
    ? ({
        paddingBottom: `calc(${scale(126)}px + ${iosPwaFooterInset})`,
      } as React.CSSProperties)
    : null;
  const iosPwaFabStyle = isIOSPwaWeb
    ? ({
        bottom: `calc(${scale(82)}px + ${iosPwaFooterInset})`,
      } as React.CSSProperties)
    : null;

  return (
    <RootShell style={[styles.safeArea, { backgroundColor: colors.background }, iosPwaRootStyle]}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme === "dark" ? "#050505" : colors.background}
      />
      <View style={[styles.container, { backgroundColor: colors.background }, iosPwaContainerStyle]}>
        {!state.hydrated ? (
          <View style={styles.centered}>
            <Text style={styles.loadingText}>Carregando dados...</Text>
          </View>
        ) : !authSettings.session_active ? (
          <AuthScreen
            colors={colors}
            mode={authMode}
            email={authEmailDraft}
            password={authPasswordDraft}
            onEmailChange={setAuthEmailDraft}
            onPasswordChange={setAuthPasswordDraft}
            onSubmit={handleAuthSubmit}
          />
        ) : (
          <>
            <Header
              colors={colors}
              entryCount={monthEntries.length}
              month={month}
              onBackPress={() => {
                setTab("home");
                setScreen("home");
              }}
              onConfigPress={() => setScreen("config")}
              total={totalMonth}
              onMonthChange={setMonth}
              screen={screen}
              tab={tab}
            />

            {screen !== "config" ? (
              <View
                style={[
                  styles.tabRow,
                  iosPwaTabRowStyle,
                  { backgroundColor: colors.card, borderTopColor: colors.borderSoft },
                ]}
              >
                <View style={[styles.tabRowInner, iosPwaTabRowInnerStyle]}>
                  {(
                  [
                    ["home", "Inicio", "⌂"],
                    ["expenses", "Gastos", "$"],
                    ["cards", "Cartoes", "="],
                    ["categories", "Categorias", "⌗"],
                    ["savings", "Guardar", "v"],
                  ] as const
                ).map(([value, label]) => (
                  <TouchableOpacity
                    key={value}
                    style={styles.tabItem}
                    onPress={() => {
                      setTab(value);
                      setScreen(value);
                    }}
                  >
                    <View
                      style={[
                        styles.tabPill,
                        tab === value ? styles.tabPillActive : styles.tabPillInactive,
                        tab === value
                          ? {
                              backgroundColor: "#050505",
                            }
                          : null,
                      ]}
                    >
                      {tab === value ? <View style={styles.tabPillGlow} /> : null}
                      <View
                        style={[
                          styles.tabIconWrap,
                          tab === value ? styles.tabIconWrapActive : styles.tabIconWrapInactive,
                        ]}
                      >
                        {value === "home" ? (
                          <Home
                            size={tab === value ? 24 : 20}
                            color={tab === value ? "#ffffff" : colors.textMuted}
                          />
                        ) : null}
                        {value === "expenses" ? (
                          <Plus
                            size={tab === value ? 24 : 20}
                            color={tab === value ? "#ffffff" : colors.textMuted}
                          />
                        ) : null}
                        {value === "cards" ? (
                          <CreditCard
                            size={tab === value ? 24 : 20}
                            color={tab === value ? "#ffffff" : colors.textMuted}
                          />
                        ) : null}
                        {value === "categories" ? (
                          <Tag
                            size={tab === value ? 24 : 20}
                            color={tab === value ? "#ffffff" : colors.textMuted}
                          />
                        ) : null}
                        {value === "savings" ? (
                          <Download
                            size={tab === value ? 24 : 20}
                            color={tab === value ? "#ffffff" : colors.textMuted}
                          />
                        ) : null}
                      </View>
                      {tab === value ? null : (
                        <Text
                          style={[
                            styles.tabLabel,
                            styles.tabLabelInactive,
                            { color: colors.textMuted },
                          ]}
                        >
                          {label}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                </View>
              </View>
            ) : null}

            <ScrollView
              contentContainerStyle={[styles.scrollContent, iosPwaScrollContentStyle]}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              bounces={false}
              alwaysBounceVertical={false}
            >
              {screen === "home" ? (
                <HomeTab
                  colors={colors}
                  month={month}
                  monthEntries={monthEntries}
                  latestEntries={latestEntries}
                  monthlyIncome={monthlyIncome}
                  totals={totals}
                  totalMonth={totalMonth}
                  savedFromIncome={monthlySavingsFromIncome}
                  onIncomePress={openIncomeModal}
                  onDeleteExpense={(entry) =>
                    updateDb((db) => removeExpenseFromDb(db, entry.expense.id))
                  }
                />
              ) : null}

              {screen === "expenses" ? (
                <ExpensesTab
                  colors={colors}
                  entries={filteredEntries}
                  search={search}
                  onSearchChange={setSearch}
                  methodFilter={methodFilter}
                  onMethodFilterChange={setMethodFilter}
                  onDeleteExpense={(entry) =>
                    updateDb((db) => removeExpenseFromDb(db, entry.expense.id))
                  }
                />
              ) : null}

              {screen === "cards" ? (
                <CardsTab
                  cards={state.db.cards}
                  colors={colors}
                  monthEntries={monthEntries}
                  onDeleteCard={(card) => updateDb((db) => removeCardFromDb(db, card.id))}
                  onCreateCard={() => setShowCardModal(true)}
                />
              ) : null}

              {screen === "categories" ? (
                <CategoriesTab
                  categories={state.db.categories}
                  colors={colors}
                  monthEntries={monthEntries}
                  onDeleteCategory={(category) =>
                    updateDb((db) => removeCategoryFromDb(db, category.id))
                  }
                />
              ) : null}

              {screen === "savings" ? (
                <SavingsTab
                  colors={colors}
                  month={month}
                  entries={monthlySavingsEntries}
                  total={monthlySavingsTotal}
                  onDeleteEntry={(entry) =>
                    updateDb((db) => ({
                      ...db,
                      settings: {
                        ...db.settings,
                        monthly_savings_by_month: (() => {
                          const nextEntries = (db.settings.monthly_savings_by_month[month] ?? []).filter(
                            (item) => item.id !== entry.id,
                          );

                          return nextEntries.length > 0
                            ? { ...db.settings.monthly_savings_by_month, [month]: nextEntries }
                            : Object.fromEntries(
                                Object.entries(db.settings.monthly_savings_by_month).filter(
                                  ([entryMonth]) => entryMonth !== month,
                                ),
                              );
                        })(),
                      },
                    }))
                  }
                />
              ) : null}

              {screen === "config" ? (
                <ConfigTab
                  colors={colors}
                  pluggy={pluggySettings}
                  pluggyBusy={pluggyBusy}
                  pluggyBackendUrlDraft={pluggyBackendUrlDraft}
                  pluggyConfigStatus={pluggyConfigStatus}
                  pluggyConnections={pluggyConnections}
                  onPluggyBackendUrlChange={setPluggyBackendUrlDraft}
                  onSavePluggyBackendUrl={savePluggyBackendUrl}
                  onPluggyConnect={() => openPluggyConnect()}
                  onPluggyResync={() => openPluggyConnect(pluggySettings.item_id ?? undefined)}
                  onPluggyImport={() => syncPluggyData()}
                  onExportBackup={exportBackup}
                  onClearPluggy={() => {
                    setPluggySettings(() => emptyDatabase().settings.pluggy);
                    setPluggyConnections([]);
                  }}
                  onClearData={() => setState({ db: emptyDatabase(), hydrated: true })}
                  onLogout={handleLogout}
                />
              ) : null}

              {screen !== "config" ? (
                <View style={styles.bottomActions}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setState({ db: emptyDatabase(), hydrated: true })}
                  >
                    <Text style={[styles.secondaryButtonText, { color: "#b00020" }]}>
                      Apagar todos os dados
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>

            {screen !== "config" ? (
              <TouchableOpacity
                style={[
                  styles.floatingAction,
                  iosPwaFabStyle,
                  { backgroundColor: colors.floatingBg },
                ]}
                onPress={handlePrimaryAction}
              >
                <Plus size={24} color={colors.floatingText} />
              </TouchableOpacity>
            ) : null}
          </>
        )}

        <ExpenseModal
          visible={showExpenseModal}
          colors={colors}
          categories={state.db.categories}
          cards={state.db.cards}
          draft={expenseDraft}
          onChange={setExpenseDraft}
          onClose={() => setShowExpenseModal(false)}
          onSave={saveExpense}
        />
        <CardModal
          visible={showCardModal}
          colors={colors}
          draft={cardDraft}
          onChange={setCardDraft}
          onClose={() => setShowCardModal(false)}
          onSave={saveCard}
        />
        <CategoryModal
          visible={showCategoryModal}
          colors={colors}
          draft={categoryDraft}
          onChange={setCategoryDraft}
          onClose={() => setShowCategoryModal(false)}
          onSave={saveCategory}
        />
        <IncomeModal
          visible={showIncomeModal}
          colors={colors}
          month={month}
          baseDraft={incomeBaseDraft}
          extraDrafts={incomeExtraDrafts}
          onBaseChange={setIncomeBaseDraft}
          onExtraDraftsChange={setIncomeExtraDrafts}
          onClose={() => setShowIncomeModal(false)}
          onSave={saveMonthlyIncome}
        />
        <SavingsModal
          visible={showSavingsModal}
          colors={colors}
          draft={savingsDraft}
          onChange={setSavingsDraft}
          onClose={() => setShowSavingsModal(false)}
          onSave={saveSavingsEntry}
        />
        {Platform.OS === "web" && pluggyComponent && pluggyConnectToken
          ? React.createElement(pluggyComponent, {
              connectToken: pluggyConnectToken,
              ...(pluggyWidgetItemId ? { itemId: pluggyWidgetItemId } : {}),
              ...(pluggySelectedConnectorId
                ? { selectedConnectorId: pluggySelectedConnectorId }
                : {}),
              onClose: () => {
                setPluggyConnectToken(null);
                setPluggyWidgetItemId(undefined);
                setPluggySelectedConnectorId(undefined);
              },
              onError: (error) => {
                setPluggyConnectToken(null);
                setPluggyWidgetItemId(undefined);
                setPluggySelectedConnectorId(undefined);
                setPluggySettings((current) => ({
                  ...current,
                  last_error: humanizePluggyError(error.message ?? "Erro no widget Pluggy"),
                }));
              },
              onSuccess: ({ item }) => {
                setPluggyConnectToken(null);
                setPluggyWidgetItemId(undefined);
                setPluggySelectedConnectorId(undefined);
                setPluggySettings((current) => ({
                  ...current,
                  item_id: item.id,
                  connector_name: item.connector?.name ?? current.connector_name,
                  item_status: item.executionStatus ?? item.status ?? null,
                  last_error: null,
                }));
                void syncPluggyData(item.id);
              },
            })
          : null}
      </View>
    </RootShell>
  );
}

function Header({
  colors,
  entryCount,
  month,
  onBackPress,
  onConfigPress,
  screen,
  tab,
  total,
  onMonthChange,
}: {
  colors: typeof lightColors;
  entryCount: number;
  month: string;
  onBackPress: () => void;
  onConfigPress: () => void;
  screen: ScreenKey;
  tab: TabKey;
  total: number;
  onMonthChange: (value: string) => void;
}) {
  const titleMap: Record<TabKey, string> = {
    home: "Inicio",
    expenses: "Gastos",
    cards: "Cartoes",
    categories: "Categorias",
    savings: "Guardar",
  };

  const subtitleMap: Record<TabKey, string> = {
    home: "Resumo do mes",
    expenses: `${entryCount} lancamentos - ${formatCurrency(total)}`,
    cards: "Limites e gastos do mes",
    categories: "Organize seus grupos",
    savings: "Dinheiro guardado fora da renda",
  };

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.background, borderBottomColor: colors.borderSoft },
      ]}
    >
      <View style={styles.headerTopRow}>
        {screen !== "home" ? (
          <TouchableOpacity
            style={[
              styles.headerGlyphButton,
              { borderColor: colors.borderSoft, backgroundColor: colors.card },
            ]}
            onPress={onBackPress}
          >
            <ArrowLeft size={22} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerGlyphSpacer} />
        )}

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textStrong }]}>
            {screen === "config" ? "Configuracoes" : titleMap[tab]}
          </Text>
          {screen !== "config" ? (
            <Text
              style={[
                styles.headerSubtitle,
                styles.headerSubtitleCentered,
                { color: colors.textMuted },
              ]}
            >
              {subtitleMap[tab]}
            </Text>
          ) : null}
        </View>
        {screen === "home" ? (
          <TouchableOpacity
            style={[
              styles.headerGlyphButton,
              { borderColor: colors.borderSoft, backgroundColor: colors.card },
            ]}
            onPress={onConfigPress}
          >
            <Settings size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerGlyphSpacer} />
        )}
      </View>

      {screen !== "config" ? (
        <View
          style={[
            styles.monthSelectorCard,
            { backgroundColor: colors.monthCard, borderColor: colors.monthCardBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.monthArrowButton}
            onPress={() => onMonthChange(shiftMonth(month, -1))}
          >
            <ChevronLeft size={18} color={colors.textStrong} />
          </TouchableOpacity>
          <Text style={[styles.monthSelectorLabel, { color: colors.textStrong }]}>
            {monthLabel(month)}
          </Text>
          <TouchableOpacity
            style={styles.monthArrowButton}
            onPress={() => onMonthChange(shiftMonth(month, 1))}
          >
            <ChevronRight size={18} color={colors.textStrong} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function HomeTab({
  colors,
  month,
  monthEntries,
  latestEntries,
  monthlyIncome,
  totals,
  totalMonth,
  savedFromIncome,
  onIncomePress,
  onDeleteExpense,
}: {
  colors: typeof lightColors;
  month: string;
  monthEntries: EntryView[];
  latestEntries: EntryView[];
  monthlyIncome: number;
  totals: Record<PaymentMethod, number>;
  totalMonth: number;
  savedFromIncome: number;
  onIncomePress: () => void;
  onDeleteExpense: (entry: EntryView) => void;
}) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | "all">("all");
  const previewMethod = selectedMethod === "all" ? null : selectedMethod;
  const chartItems = useMemo(
    () =>
      ["credit", "pix", "debit", "cash"]
        .map((methodValue) => {
          const method = PAYMENT_METHODS.find((item) => item.value === methodValue);
          if (!method) return null;
          const total = totals[method.value];
          const percentage = totalMonth > 0 ? Math.max(total / totalMonth, 0) : 0;

          return {
            key: method.value,
            label: PAYMENT_LABELS[method.value],
            value: total,
            percentage,
            color: PAYMENT_CHART_COLORS[method.value],
          } satisfies PaymentChartItem;
        })
        .filter((item): item is PaymentChartItem => item !== null),
    [totalMonth, totals],
  );
  const visibleEntries = useMemo(
    () =>
      selectedMethod === "all"
        ? latestEntries
        : latestEntries.filter((entry) => entry.expense.payment_method === selectedMethod),
    [latestEntries, selectedMethod],
  );

  return (
    <View style={styles.sectionStack}>
      <IncomeSummaryCard
        colors={colors}
        income={monthlyIncome}
        spent={totalMonth + savedFromIncome}
        savedFromIncome={savedFromIncome}
        month={month}
        onPress={onIncomePress}
      />
      <SummaryBox
        colors={colors}
        title={`Total gasto em ${monthLabel(month).split(" de ")[0]?.toLowerCase() ?? month}`}
        value={formatCurrency(totalMonth)}
        darkPanel
        donutItems={chartItems}
        donutActiveKey={selectedMethod === "all" ? null : selectedMethod}
        onDonutPress={(method) =>
          setSelectedMethod((current) => (current === method ? "all" : method))
        }
        meta={
          previewMethod
            ? `${PAYMENT_LABELS[previewMethod]}: ${formatCurrency(totals[previewMethod])} • ${Math.round((totals[previewMethod] / Math.max(totalMonth, 1)) * 100)}%`
            : selectedMethod === "all"
              ? "Toque nos cards ou no grafico para filtrar"
              : `Filtro: ${PAYMENT_LABELS[selectedMethod]}`
        }
      />
      <View style={styles.summaryGrid}>
        {chartItems.map((item) => (
          <SummaryBox
            key={item.key}
            colors={colors}
            title={item.label}
            value={formatCurrency(item.value)}
            compact
            accentColor={item.color}
            progress={item.percentage}
            meta={`${Math.round(item.percentage * 100)}% do mes`}
            active={selectedMethod === item.key}
            onPress={() =>
              setSelectedMethod((current) => (current === item.key ? "all" : item.key))
            }
          />
        ))}
      </View>
      <SectionTitle
        colors={colors}
        title="Ultimos gastos"
        subtitle={
          selectedMethod === "all" ? "Todos os meios de pagamento" : PAYMENT_LABELS[selectedMethod]
        }
      />
      {visibleEntries.length === 0 ? (
        <EmptyCard
          colors={colors}
          icon={<Home size={30} color={colors.textMuted} />}
          title="Nenhum gasto neste filtro."
          text="Toque em outro card para ver mais gastos."
        />
      ) : (
        visibleEntries.map((entry) => (
          <ExpenseRow
            colors={colors}
            key={entry.installment.id}
            entry={entry}
            onDelete={() => onDeleteExpense(entry)}
          />
        ))
      )}
    </View>
  );
}

function ExpensesTab({
  colors,
  entries,
  search,
  onSearchChange,
  methodFilter,
  onMethodFilterChange,
  onDeleteExpense,
}: {
  colors: typeof lightColors;
  entries: EntryView[];
  search: string;
  onSearchChange: (value: string) => void;
  methodFilter: PaymentMethod | "all";
  onMethodFilterChange: (value: PaymentMethod | "all") => void;
  onDeleteExpense: (entry: EntryView) => void;
}) {
  return (
    <View style={styles.sectionStack}>
      <Field colors={colors} label="Buscar">
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              borderColor: colors.borderSoft,
              color: colors.textStrong,
            },
          ]}
          value={search}
          placeholder="Buscar pela descricao"
          placeholderTextColor={colors.textMuted}
          onChangeText={onSearchChange}
        />
      </Field>
      <View style={styles.chipWrap}>
        <Chip
          colors={colors}
          label="Todos"
          active={methodFilter === "all"}
          onPress={() => onMethodFilterChange("all")}
        />
        {PAYMENT_METHODS.map((item) => (
          <Chip
            key={item.value}
            colors={colors}
            label={PAYMENT_LABELS[item.value]}
            active={methodFilter === item.value}
            onPress={() => onMethodFilterChange(item.value)}
          />
        ))}
      </View>
      {entries.length === 0 ? (
        <EmptyCard
          colors={colors}
          icon={<Plus size={30} color={colors.textMuted} />}
          title="Nenhum gasto registrado neste mes."
          text="Toque no botao + para adicionar seu primeiro gasto."
        />
      ) : (
        entries.map((entry) => (
          <ExpenseRow
            colors={colors}
            key={entry.installment.id}
            entry={entry}
            onDelete={() => onDeleteExpense(entry)}
          />
        ))
      )}
    </View>
  );
}

function CardsTab({
  cards,
  colors,
  monthEntries,
  onCreateCard,
  onDeleteCard,
}: {
  cards: Card[];
  colors: typeof lightColors;
  monthEntries: EntryView[];
  onCreateCard: () => void;
  onDeleteCard: (card: Card) => void;
}) {
  return (
    <View style={styles.sectionStack}>
      <SectionTitle colors={colors} title="Cartoes" subtitle={`${cards.length} cadastrados`} />
      {cards.length === 0 ? (
        <EmptyCard
          colors={colors}
          icon={<CreditCard size={30} color={colors.textMuted} />}
          title="Nenhum cartao cadastrado."
          text="Cadastre um cartao para registrar gastos no credito ou debito."
          actionLabel="Cadastrar cartao"
          onAction={onCreateCard}
        />
      ) : (
        cards.map((card) => {
          const brand = getCardBrandMeta(card);

          return (
            <View
              key={card.id}
              style={[
                styles.cardRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderSoft,
                  borderLeftColor: brand.accent || brand.text,
                },
              ]}
            >
              <View style={styles.cardRowContent}>
                <View style={styles.cardTitleRow}>
                  <MiniCardFlag card={card} brand={brand} />
                  <Text style={[styles.cardTitle, { color: colors.textStrong }]}>{card.name}</Text>
                </View>
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                  {(card.institution || "Sem banco") +
                    " - total no mes " +
                    formatCurrency(cardMonthTotal(card.id, monthEntries))}
                </Text>
              </View>
              <TouchableOpacity onPress={() => onDeleteCard(card)}>
                <Text style={styles.deleteText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );
}

function getCardBrandMeta(card: Card) {
  const source = `${card.name} ${card.institution || ""}`.toLowerCase();
  const explicitBrand = card.brand;

  if (explicitBrand === "mastercard") {
    return {
      key: "mastercard",
      label: "MC",
      bg: "#201116",
      border: "#3a1d24",
      text: "#f97316",
      accent: "#f97316",
      accentAlt: "#ef4444",
    };
  }

  if (explicitBrand === "visa") {
    return {
      key: "visa",
      label: "VISA",
      bg: "#0e1733",
      border: "#1d3f8f",
      text: "#60a5fa",
      accent: "#2563eb",
    };
  }

  if (explicitBrand === "elo") {
    return {
      key: "elo",
      label: "ELO",
      bg: "#171717",
      border: "#303030",
      text: "#facc15",
      accent: "#22c55e",
      accentAlt: "#ef4444",
    };
  }

  if (explicitBrand === "amex") {
    return {
      key: "amex",
      label: "AMEX",
      bg: "#082f49",
      border: "#0ea5e9",
      text: "#67e8f9",
      accent: "#06b6d4",
    };
  }

  if (explicitBrand === "hipercard") {
    return {
      key: "hipercard",
      label: "HIPER",
      bg: "#3b0a0a",
      border: "#7f1d1d",
      text: "#fda4af",
      accent: "#ef4444",
    };
  }

  if (explicitBrand === "nubank") {
    return {
      key: "nubank",
      label: "NU",
      bg: "#2e1065",
      border: "#7c3aed",
      text: "#c4b5fd",
      accent: "#7c3aed",
    };
  }

  if (source.includes("master")) {
    return {
      key: "mastercard",
      label: "MC",
      bg: "#201116",
      border: "#3a1d24",
      text: "#f97316",
      accent: "#f97316",
      accentAlt: "#ef4444",
    };
  }

  if (source.includes("visa")) {
    return {
      key: "visa",
      label: "VISA",
      bg: "#0e1733",
      border: "#1d3f8f",
      text: "#60a5fa",
      accent: "#2563eb",
    };
  }

  if (source.includes("elo")) {
    return {
      key: "elo",
      label: "ELO",
      bg: "#171717",
      border: "#303030",
      text: "#facc15",
      accent: "#22c55e",
      accentAlt: "#ef4444",
    };
  }

  if (source.includes("amex") || source.includes("american express")) {
    return {
      key: "amex",
      label: "AMEX",
      bg: "#082f49",
      border: "#0ea5e9",
      text: "#67e8f9",
      accent: "#06b6d4",
    };
  }

  if (source.includes("hipercard")) {
    return {
      key: "hipercard",
      label: "HIPER",
      bg: "#3b0a0a",
      border: "#7f1d1d",
      text: "#fda4af",
      accent: "#ef4444",
    };
  }

  if (source.includes("nubank")) {
    return {
      key: "nubank",
      label: "NU",
      bg: "#2e1065",
      border: "#7c3aed",
      text: "#c4b5fd",
      accent: "#7c3aed",
    };
  }

  return {
    key: "default",
    label: card.type === "debit" ? "DEB" : card.type === "credit" ? "CRD" : "CARD",
    bg: "#161616",
    border: "#2d2d2d",
    text: card.type === "debit" ? "#60a5fa" : card.type === "credit" ? "#a78bfa" : "#e5e7eb",
    accent: card.color,
  };
}

function MiniCardFlag({
  card,
  brand = getCardBrandMeta(card),
}: {
  card: Card;
  brand?: ReturnType<typeof getCardBrandMeta>;
}) {
  if (brand.key === "mastercard") {
    return (
      <View style={[styles.cardFlag, { backgroundColor: brand.bg, borderColor: brand.border }]}>
        <View style={styles.cardFlagMasterWrap}>
          <View style={[styles.cardFlagMasterCircle, { backgroundColor: brand.text }]} />
          <View
            style={[
              styles.cardFlagMasterCircle,
              styles.cardFlagMasterOverlap,
              { backgroundColor: brand.accentAlt || brand.accent || brand.text },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.cardFlag, { backgroundColor: brand.bg, borderColor: brand.border }]}>
      <Text style={[styles.cardFlagText, { color: brand.text }]}>{brand.label}</Text>
    </View>
  );
}

function getExpenseBrandMeta(entry: EntryView) {
  const source =
    `${entry.expense.description} ${entry.category?.name || ""} ${entry.card?.name || ""}`.toLowerCase();

  if (source.includes("netflix")) {
    return {
      key: "netflix",
      label: "N",
      bg: "#2a0d12",
      border: "#4b1119",
      text: "#ef4444",
    };
  }

  if (source.includes("spotify")) {
    return {
      key: "spotify",
      label: "S",
      bg: "#0d1f14",
      border: "#163222",
      text: "#22c55e",
    };
  }

  if (
    source.includes("mcdonald") ||
    source.includes("mc donald") ||
    source.includes("mcdonald") ||
    source.includes("méqui") ||
    source.includes("mequi")
  ) {
    return {
      key: "mcdonalds",
      label: "M",
      bg: "#261306",
      border: "#4a2207",
      text: "#facc15",
    };
  }

  if (source.includes("youtube")) {
    return {
      key: "youtube",
      label: "YT",
      bg: "#2a0d12",
      border: "#4b1119",
      text: "#ef4444",
    };
  }

  if (source.includes("uber")) {
    return {
      key: "uber",
      label: "U",
      bg: "#141414",
      border: "#2d2d2d",
      text: "#fafafa",
    };
  }

  if (source.includes("ifood")) {
    return {
      key: "ifood",
      label: "iF",
      bg: "#2a0d12",
      border: "#4b1119",
      text: "#ef4444",
    };
  }

  if (entry.expense.payment_method === "pix") {
    return {
      key: "pix",
      label: "PIX",
      bg: "#082029",
      border: "#134252",
      text: "#22d3ee",
    };
  }

  if (entry.expense.payment_method === "debit") {
    return {
      key: "debit",
      label: "DB",
      bg: "#0f172a",
      border: "#1e3a8a",
      text: "#60a5fa",
    };
  }

  if (entry.expense.payment_method === "cash") {
    return {
      key: "cash",
      label: "$",
      bg: "#1a1408",
      border: "#4d3a12",
      text: "#f59e0b",
    };
  }

  if (entry.expense.payment_method === "credit") {
    return {
      key: "credit",
      label: "CR",
      bg: "#1f1235",
      border: "#5b21b6",
      text: "#a78bfa",
    };
  }

  return {
    key: "default",
    label: "•",
    bg: "#161616",
    border: "#2d2d2d",
    text: "#e5e7eb",
  };
}

function MiniExpenseBrandIcon({ entry }: { entry: EntryView }) {
  const brand = getExpenseBrandMeta(entry);

  return (
    <View
      style={[styles.expenseBrandIcon, { backgroundColor: brand.bg, borderColor: brand.border }]}
    >
      <Text style={[styles.expenseBrandIconText, { color: brand.text }]}>{brand.label}</Text>
    </View>
  );
}

function CategoriesTab({
  categories,
  colors,
  monthEntries,
  onDeleteCategory,
}: {
  categories: Category[];
  colors: typeof lightColors;
  monthEntries: EntryView[];
  onDeleteCategory: (category: Category) => void;
}) {
  const totals = new Map(totalsByCategory(monthEntries).map((item) => [item.id, item.total]));

  return (
    <View style={styles.sectionStack}>
      <SectionTitle
        colors={colors}
        title="Categorias"
        subtitle={`${categories.length} cadastradas`}
      />
      {categories.length === 0 ? (
        <EmptyCard
          colors={colors}
          icon={<Tag size={30} color={colors.textMuted} />}
          title="Nenhuma categoria cadastrada."
          text="Crie categorias para organizar seus gastos."
        />
      ) : null}
      {categories.map((category) => (
        <View
          key={category.id}
          style={[
            styles.cardRow,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderSoft,
              borderLeftColor: category.color,
            },
          ]}
        >
          <View style={styles.cardRowContent}>
            <Text style={[styles.cardTitle, { color: colors.textStrong }]}>{category.name}</Text>
            <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
              {"Total no mes " + formatCurrency(totals.get(category.id) ?? 0)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onDeleteCategory(category)}>
            <Text style={styles.deleteText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

function SavingsTab({
  colors,
  month,
  entries,
  total,
  onDeleteEntry,
}: {
  colors: typeof lightColors;
  month: string;
  entries: MonthlySavingsEntry[];
  total: number;
  onDeleteEntry: (entry: MonthlySavingsEntry) => void;
}) {
  return (
    <View style={styles.sectionStack}>
      <SectionTitle
        colors={colors}
        title="Dinheiro guardado"
        subtitle={`Total em ${monthLabel(month).split(" de ")[0]?.toLowerCase() ?? month}`}
      />
      <View
        style={[styles.savingsSummaryCard, { backgroundColor: colors.card, borderColor: colors.borderSoft }]}
      >
        <Text style={[styles.summaryTitle, { color: colors.textMuted }]}>Total guardado no mes</Text>
        <Text style={[styles.savingsSummaryValue, { color: colors.textStrong }]}>
          {formatCurrency(total)}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          Esse valor fica separado e nao soma com a renda.
        </Text>
      </View>
      {entries.length === 0 ? (
        <EmptyCard
          colors={colors}
          icon={<Download size={30} color={colors.textMuted} />}
          title="Nada guardado neste mes."
          text="Toque no botao + para registrar um valor separado da renda."
        />
      ) : null}
      {entries.map((entry) => (
        <View
          key={entry.id}
          style={[styles.cardRow, { backgroundColor: colors.card, borderColor: colors.borderSoft }]}
        >
          <View style={styles.cardRowContent}>
            <Text style={[styles.cardTitle, { color: colors.textStrong }]}>{entry.description}</Text>
            <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
              {formatDateBR(entry.created_at.slice(0, 10)) + " - " + formatCurrency(entry.amount)}
            </Text>
            <View style={styles.chipWrap}>
              {entry.already_saved ? (
                <Chip colors={colors} label="Ja guardado" active={false} onPress={() => {}} />
              ) : null}
              {entry.deduct_from_income ? (
                <Chip colors={colors} label="Retira da renda do mes" active onPress={() => {}} />
              ) : null}
            </View>
          </View>
          <TouchableOpacity onPress={() => onDeleteEntry(entry)}>
            <Text style={styles.deleteText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

function AuthScreen({
  colors,
  mode,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  colors: typeof lightColors;
  mode: AuthMode;
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const isRegister = mode === "register";
  const authCardBg = "#000000";
  const authBorder = "#7c3aed";
  const authInputBorder = "#2f2f35";
  const authText = "#f5f5f5";
  const authMuted = "#6a6a70";
  const authPrimary = "#7c3aed";

  return (
    <View style={styles.authScreen}>
      <View
        style={[
          styles.authCard,
          { backgroundColor: authCardBg, borderColor: authBorder, shadowColor: authPrimary },
        ]}
      >
        <View style={styles.authTopBlock}>
          <View style={styles.authBrandWrap}>
            <Image source={logoLogin} style={styles.authLogo} resizeMode="contain" />
          </View>
          <Text style={[styles.authSubtitle, { color: authMuted }]}>
            {isRegister
              ? "Crie seu acesso para guardar seus gastos com mais privacidade."
              : "Entre para acompanhar gastos, renda e conexões da sua conta."}
          </Text>
        </View>
        <View style={styles.authFormBlock}>
          <View style={styles.authField}>
            <Text style={[styles.authFieldLabel, { color: authText }]}>E-mail</Text>
            <TextInput
              style={[
                styles.input,
                styles.authInput,
                { backgroundColor: "#111111", borderColor: authInputBorder, color: authText },
              ]}
              value={email}
              onChangeText={onEmailChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="voce@email.com"
              placeholderTextColor={authMuted}
            />
          </View>
          <View style={styles.authField}>
            <Text style={[styles.authFieldLabel, { color: authText }]}>Senha</Text>
            <TextInput
              style={[
                styles.input,
                styles.authInput,
                { backgroundColor: "#111111", borderColor: authInputBorder, color: authText },
              ]}
              value={password}
              onChangeText={onPasswordChange}
              secureTextEntry
              placeholder="Digite sua senha"
              placeholderTextColor={authMuted}
            />
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            styles.authPrimaryButton,
            { backgroundColor: authPrimary, marginTop: scale(14), shadowColor: authPrimary },
          ]}
          onPress={onSubmit}
        >
          <Text
            style={[styles.primaryButtonText, styles.authPrimaryButtonText, { color: "#ffffff" }]}
          >
            {isRegister ? "Criar acesso" : "Acessar"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ConfigTab({
  colors,
  pluggy,
  pluggyBusy,
  pluggyBackendUrlDraft,
  pluggyConfigStatus,
  pluggyConnections,
  onPluggyBackendUrlChange,
  onSavePluggyBackendUrl,
  onPluggyConnect,
  onPluggyResync,
  onPluggyImport,
  onExportBackup,
  onClearPluggy,
  onClearData,
  onLogout,
}: {
  colors: typeof lightColors;
  pluggy: Database["settings"]["pluggy"];
  pluggyBusy: boolean;
  pluggyBackendUrlDraft: string;
  pluggyConfigStatus: PluggyProxyConfigStatus;
  pluggyConnections: PluggyPersistedConnectionSummary[];
  onPluggyBackendUrlChange: (value: string) => void;
  onSavePluggyBackendUrl: () => void;
  onPluggyConnect: () => void;
  onPluggyResync: () => void;
  onPluggyImport: () => void;
  onExportBackup: () => void;
  onClearPluggy: () => void;
  onClearData: () => void;
  onLogout: () => void;
}) {
  const isPluggyConnected = Boolean(pluggy.item_id && pluggy.item_status === "SUCCESS");
  const statusTone = pluggy.last_error
    ? "#b00020"
    : isPluggyConnected
      ? colors.primary
      : colors.textMuted;
  const statusLabel = pluggy.last_error
    ? "Indisponivel no momento"
    : isPluggyConnected
      ? "Conexao ativa"
      : "Pronto para conectar";
  const connectionSummary = pluggy.last_error
    ? "No momento nao foi possivel concluir integracao bancaria. Tente novamente em instantes."
    : isPluggyConnected
      ? "Sua conta esta pronta para sincronizar gastos automaticamente."
      : "Conecte sua conta para importar gastos sem preencher tudo manualmente.";

  return (
    <View style={styles.sectionStack}>
      <SectionTitle
        colors={colors}
        title="Conexao bancaria"
        subtitle="Conecte sua conta para importar gastos de forma mais pratica."
      />
      <View
        style={[
          styles.groupSection,
          { backgroundColor: colors.card, borderColor: colors.borderSoft, gap: scale(10) },
        ]}
      >
        <Field colors={colors} label="URL do backend Pluggy">
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.borderSoft,
                color: colors.textStrong,
              },
            ]}
            value={pluggyBackendUrlDraft}
            onChangeText={onPluggyBackendUrlChange}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://localhost:3000"
            placeholderTextColor={colors.textMuted}
          />
        </Field>
        {pluggyConfigStatus.clientIdMasked ? (
          <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
            Credencial ativa no backend: {pluggyConfigStatus.clientIdMasked}
          </Text>
        ) : null}
        {pluggyConfigStatus.apiUrl ? (
          <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
            API Pluggy configurada no backend: {pluggyConfigStatus.apiUrl}
          </Text>
        ) : null}
        {pluggyConfigStatus.webhookUrl ? (
          <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
            Webhook publico esperado: {pluggyConfigStatus.webhookUrl}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            { backgroundColor: colors.background, borderColor: colors.borderSoft },
          ]}
          onPress={onSavePluggyBackendUrl}
        >
          <View style={styles.actionButtonContent}>
            <Settings size={18} color={colors.textStrong} />
            <Text style={[styles.secondaryButtonText, { color: colors.textStrong }]}>
              Salvar URL do backend
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <View
        style={[
          styles.groupSection,
          { backgroundColor: colors.card, borderColor: colors.borderSoft, gap: scale(10) },
        ]}
      >
        <View style={styles.summaryBoxHeader}>
          <Text style={[styles.groupLabel, { color: colors.textStrong }]}>
            Status da integracao
          </Text>
          <Text style={[styles.incomeCardLink, { color: statusTone }]}>{statusLabel}</Text>
        </View>
        {pluggy.connector_name ? (
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Instituicao conectada: {pluggy.connector_name}
          </Text>
        ) : null}
        {pluggy.item_status && isPluggyConnected ? (
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Status tecnico: {pluggy.item_status}
          </Text>
        ) : null}
        {pluggy.last_sync_at ? (
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Ultima importacao: {formatDateBR(pluggy.last_sync_at)}
          </Text>
        ) : null}
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          {connectionSummary}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          {pluggyConfigStatus.configured
            ? "Segredos Pluggy presentes somente no backend."
            : "Backend ainda sem PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET."}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          {pluggyConfigStatus.webhookConfigured
            ? "Webhook backend configurado por variavel de ambiente."
            : "Webhook ainda nao configurado no backend."}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          {pluggyConfigStatus.webhookReady
            ? "URL publica HTTPS pronta para registrar webhook na Pluggy."
            : "Defina API_EXTERNAL_URL com HTTPS para registrar o webhook na Pluggy."}
        </Text>
        {pluggy.last_error ? (
          <Text style={[styles.sectionSubtitle, { color: statusTone }]}>{pluggy.last_error}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={onPluggyConnect}
      >
        <View style={styles.actionButtonContent}>
          <Link2 size={18} color={colors.primaryText} />
          <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>
            {pluggyBusy
              ? "Conectando..."
              : pluggy.item_id
                ? "Conectar novamente"
                : "Conectar banco"}
          </Text>
        </View>
      </TouchableOpacity>
      {pluggyConnections.length > 0 ? (
        <>
          <SectionTitle
            colors={colors}
            title="Contas reais importadas"
            subtitle="Resumo persistido no backend das contas, saldos e transacoes vindos da Pluggy."
          />
          {pluggyConnections.map((connection) => (
            <View
              key={connection.id}
              style={[
                styles.groupSection,
                { backgroundColor: colors.card, borderColor: colors.borderSoft, gap: scale(8) },
              ]}
            >
              <Text style={[styles.groupLabel, { color: colors.textStrong }]}>
                Item {connection.itemId.slice(0, 8)}...
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                Status persistido: {connection.status}
              </Text>
              {connection.lastSyncAt ? (
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  Ultima sincronizacao backend: {formatDateBR(connection.lastSyncAt)}
                </Text>
              ) : null}
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                Total de transacoes persistidas: {connection.transactionsCount}
              </Text>
              {connection.accounts.map((account, index) => (
                <Text
                  key={`${connection.id}-account-${index}`}
                  style={[styles.sectionSubtitle, { color: colors.textMuted }]}
                >
                  Conta: {account.nome} | Tipo: {account.tipo} | Saldo:{" "}
                  {formatCurrency(Math.round(account.saldoAtual * 100))}
                </Text>
              ))}
              {connection.cards.map((card, index) => (
                <Text
                  key={`${connection.id}-card-${index}`}
                  style={[styles.sectionSubtitle, { color: colors.textMuted }]}
                >
                  Cartao: {card.nome}
                  {card.ultimosQuatroDigitos ? ` final ${card.ultimosQuatroDigitos}` : ""} | Limite:{" "}
                  {formatCurrency(Math.round(card.limiteTotal * 100))}
                </Text>
              ))}
              {connection.lastError ? (
                <Text style={[styles.sectionSubtitle, { color: "#b00020" }]}>
                  Ultimo erro backend: {connection.lastError}
                </Text>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
      {pluggy.item_id ? (
        <>
          <SectionTitle colors={colors} title="Sincronizacao" />
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { backgroundColor: colors.card, borderColor: colors.borderSoft },
            ]}
            onPress={onPluggyResync}
          >
            <View style={styles.actionButtonContent}>
              <RefreshCw size={18} color={colors.textStrong} />
              <Text style={[styles.secondaryButtonText, { color: colors.textStrong }]}>
                Atualizar conexao
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { backgroundColor: colors.card, borderColor: colors.borderSoft },
            ]}
            onPress={onPluggyImport}
          >
            <View style={styles.actionButtonContent}>
              <Download size={18} color={colors.textStrong} />
              <Text style={[styles.secondaryButtonText, { color: colors.textStrong }]}>
                Sincronizar gastos agora
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { backgroundColor: colors.card, borderColor: colors.borderSoft },
            ]}
            onPress={onClearPluggy}
          >
            <View style={styles.actionButtonContent}>
              <Trash2 size={18} color="#b00020" />
              <Text style={[styles.dangerButtonText, { color: "#b00020" }]}>Desconectar conta</Text>
            </View>
          </TouchableOpacity>
        </>
      ) : null}

      <SectionTitle
        colors={colors}
        title="Seus dados"
        subtitle="Guarde uma copia dos seus gastos em JSON."
      />
      <TouchableOpacity
        style={[
          styles.secondaryButton,
          { backgroundColor: colors.background, borderColor: colors.borderSoft },
        ]}
        onPress={onExportBackup}
      >
        <View style={styles.actionButtonContent}>
          <Download size={18} color={colors.textStrong} />
          <Text style={[styles.secondaryButtonText, { color: colors.textStrong }]}>
            Exportar gastos em PDF
          </Text>
        </View>
      </TouchableOpacity>
      <SectionTitle
        colors={colors}
        title="Dados"
        subtitle="Gerencie dados salvos neste aparelho."
      />
      <TouchableOpacity
        style={[
          styles.secondaryButton,
          styles.accessButton,
          styles.dangerOutlineButton,
          { backgroundColor: "rgba(176, 0, 32, 0.08)", borderColor: "rgba(176, 0, 32, 0.35)" },
        ]}
        onPress={onClearData}
      >
        <View style={styles.actionButtonContent}>
          <Trash2 size={18} color="#b00020" />
          <Text style={[styles.dangerButtonText, { color: "#b00020" }]}>Apagar todos os dados</Text>
        </View>
      </TouchableOpacity>
      <Text
        style={[
          styles.sectionSubtitle,
          { color: colors.textMuted, textAlign: "center", marginTop: scale(2) },
        ]}
      >
        Os dados ficam salvos apenas neste aparelho.
      </Text>
      <TouchableOpacity
        style={[
          styles.secondaryButton,
          styles.accessButton,
          { backgroundColor: colors.card, borderColor: colors.borderSoft, marginTop: scale(12) },
        ]}
        onPress={onLogout}
      >
        <View style={styles.actionButtonContent}>
          <ArrowLeft size={18} color={colors.textStrong} />
          <Text style={[styles.secondaryButtonText, { color: colors.textStrong }]}>Sair</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function ExpenseModal({
  visible,
  colors,
  categories,
  cards,
  draft,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  colors: typeof lightColors;
  categories: Category[];
  cards: Card[];
  draft: ExpenseDraft;
  onChange: React.Dispatch<React.SetStateAction<ExpenseDraft>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const [openList, setOpenList] = useState<"recurrence" | "payment" | "category" | "card" | null>(
    null,
  );
  if (!visible) return null;

  const recurrenceOptions = [
    { value: "once", label: "Sem recorrencia" },
    { value: "week", label: "Semanal" },
    { value: "month", label: "Mensal" },
    { value: "year", label: "Anual" },
    { value: "installment", label: "Parcelado" },
  ] as const;

  const recurrenceLabel =
    draft.recurrenceType === "week"
      ? "Quantidade de semanas"
      : draft.recurrenceType === "month"
        ? "Quantidade de meses"
        : draft.recurrenceType === "year"
          ? "Quantidade de anos"
          : draft.recurrenceType === "installment"
            ? "Quantidade de parcelas"
            : "";

  return (
    <Sheet title="Novo gasto" colors={colors} onClose={onClose}>
      <Field colors={colors} label="Descricao">
        <TextInput
          style={[styles.input, modalInputStyle(colors)]}
          value={draft.description}
          onChangeText={(value) => onChange((current) => ({ ...current, description: value }))}
        />
      </Field>
      <Field colors={colors} label="Valor (R$)">
        <TextInput
          style={[styles.input, modalInputStyle(colors)]}
          keyboardType="numeric"
          placeholder="0,00"
          placeholderTextColor={colors.textMuted}
          value={draft.amountText}
          onChangeText={(value) =>
            onChange((current) => ({ ...current, amountText: maskCurrencyInput(value) }))
          }
        />
      </Field>
      <Field colors={colors} label="Data">
        <View style={styles.fieldStack}>
          <TextInput
            style={[styles.input, modalInputStyle(colors)]}
            placeholder="2026-08-04"
            placeholderTextColor={colors.textMuted}
            value={draft.expenseDate}
            onChangeText={(value) => onChange((current) => ({ ...current, expenseDate: value }))}
          />
          <DropdownField
            colors={colors}
            isOpen={openList === "recurrence"}
            options={recurrenceOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            selectedValue={draft.recurrenceType}
            onToggle={() =>
              setOpenList((current) => (current === "recurrence" ? null : "recurrence"))
            }
            onSelect={(value) => {
              onChange((current) => ({
                ...current,
                recurrenceType: value as ExpenseDraft["recurrenceType"],
                paymentMethod: value === "installment" ? "credit" : current.paymentMethod,
                recurrenceCount:
                  value === "once"
                    ? "1"
                    : value === "installment"
                      ? current.recurrenceCount === "1"
                        ? "2"
                        : current.recurrenceCount
                      : current.recurrenceCount,
                installmentCount: value === "installment" ? current.recurrenceCount : "1",
              }));
              setOpenList(null);
            }}
          />
          {draft.recurrenceType !== "once" ? (
            <TextInput
              style={[styles.input, modalInputStyle(colors)]}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={colors.textMuted}
              value={draft.recurrenceCount}
              onChangeText={(value) =>
                onChange((current) => ({
                  ...current,
                  recurrenceCount: value,
                  installmentCount: current.recurrenceType === "installment" ? value : "1",
                }))
              }
            />
          ) : null}
          {draft.recurrenceType !== "once" ? (
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              {recurrenceLabel}
            </Text>
          ) : null}
        </View>
      </Field>
      <Field colors={colors} label="Pagamento">
        <DropdownField
          colors={colors}
          isOpen={openList === "payment"}
          options={PAYMENT_METHODS.map((item) => ({
            value: item.value,
            label: PAYMENT_LABELS[item.value],
          }))}
          selectedValue={draft.paymentMethod}
          onToggle={() => setOpenList((current) => (current === "payment" ? null : "payment"))}
          onSelect={(value) => {
            onChange((current) => ({
              ...current,
              paymentMethod: value as PaymentMethod,
              cardId: requiresCard(value as PaymentMethod) ? current.cardId : null,
              recurrenceType:
                current.recurrenceType === "installment" && value !== "credit"
                  ? "once"
                  : current.recurrenceType,
              installmentCount: value === "credit" ? current.installmentCount : "1",
            }));
            setOpenList(null);
          }}
        />
      </Field>
      <Field colors={colors} label="Categoria">
        <DropdownField
          colors={colors}
          isOpen={openList === "category"}
          options={categories.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
          selectedValue={draft.categoryId}
          onToggle={() => setOpenList((current) => (current === "category" ? null : "category"))}
          onSelect={(value) => {
            onChange((current) => ({ ...current, categoryId: value }));
            setOpenList(null);
          }}
        />
      </Field>
      {requiresCard(draft.paymentMethod) ? (
        <Field colors={colors} label="Cartao">
          <DropdownField
            colors={colors}
            isOpen={openList === "card"}
            options={cards.map((card) => ({
              value: card.id,
              label: card.name,
            }))}
            selectedValue={draft.cardId}
            onToggle={() => setOpenList((current) => (current === "card" ? null : "card"))}
            onSelect={(value) => {
              onChange((current) => ({ ...current, cardId: value }));
              setOpenList(null);
            }}
          />
        </Field>
      ) : null}
      <Field colors={colors} label="Observacoes">
        <TextInput
          style={[styles.input, styles.textArea, modalInputStyle(colors)]}
          multiline
          value={draft.notes}
          onChangeText={(value) => onChange((current) => ({ ...current, notes: value }))}
        />
      </Field>
      <ModalActions colors={colors} onClose={onClose} onSave={onSave} saveLabel="Salvar gasto" />
    </Sheet>
  );
}

function CardModal({
  visible,
  colors,
  draft,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  colors: typeof lightColors;
  draft: CardDraft;
  onChange: React.Dispatch<React.SetStateAction<CardDraft>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const [openList, setOpenList] = useState<"institution" | "type" | null>(null);
  const cardDigits = getCardNumberDigits(draft.cardNumber);
  const detectedCardBrand = detectCardBrandFromNumber(draft.cardNumber);
  const cardNumberInvalid = cardDigits.length >= 13 && !isValidCardNumber(draft.cardNumber);
  if (!visible) return null;

  return (
    <Sheet title="Novo cartao" colors={colors} onClose={onClose}>
      <Field colors={colors} label="Nome">
        <TextInput
          style={[styles.input, modalInputStyle(colors)]}
          value={draft.name}
          onChangeText={(value) => onChange((current) => ({ ...current, name: value }))}
        />
      </Field>
      <Field colors={colors} label="Instituicao">
        <DropdownField
          colors={colors}
          isOpen={openList === "institution"}
          options={BRAZILIAN_INSTITUTIONS.map((institution) => ({
            value: institution,
            label: institution,
          }))}
          selectedValue={draft.institution || BRAZILIAN_INSTITUTIONS[0]}
          onToggle={() =>
            setOpenList((current) => (current === "institution" ? null : "institution"))
          }
          onSelect={(value) => {
            onChange((current) => ({ ...current, institution: value }));
            setOpenList(null);
          }}
        />
      </Field>
      <Field colors={colors} label="Tipo">
        <DropdownField
          colors={colors}
          isOpen={openList === "type"}
          options={[
            { value: "credit", label: "Credito" },
            { value: "debit", label: "Debito" },
            { value: "both", label: "Ambos" },
          ]}
          selectedValue={draft.type}
          onToggle={() => setOpenList((current) => (current === "type" ? null : "type"))}
          onSelect={(value) => {
            onChange((current) => ({
              ...current,
              type: value as CardDraft["type"],
            }));
            setOpenList(null);
          }}
        />
      </Field>
      <Field colors={colors} label="Numero do cartao">
        <TextInput
          style={[styles.input, modalInputStyle(colors)]}
          keyboardType="numeric"
          placeholder="0000 0000 0000 0000"
          placeholderTextColor={colors.textMuted}
          value={draft.cardNumber}
          onChangeText={(value) =>
            onChange((current) => ({ ...current, cardNumber: maskCardNumberInput(value) }))
          }
        />
        {cardDigits.length > 0 ? (
          <Text
            style={[styles.fieldHint, { color: cardNumberInvalid ? "#ef4444" : colors.textMuted }]}
          >
            {cardNumberInvalid
              ? "Numero invalido"
              : `Bandeira detectada: ${getDetectedCardBrandLabel(detectedCardBrand) ?? "Nao identificada"}`}
          </Text>
        ) : null}
      </Field>
      <Field colors={colors} label="Limite (R$)">
        <TextInput
          style={[styles.input, modalInputStyle(colors)]}
          keyboardType="numeric"
          value={draft.creditLimit}
          onChangeText={(value) =>
            onChange((current) => ({ ...current, creditLimit: maskCurrencyInput(value) }))
          }
        />
      </Field>
      <Field colors={colors} label="Fechamento">
        <TextInput
          style={[styles.input, modalInputStyle(colors)]}
          keyboardType="numeric"
          value={draft.closingDay}
          onChangeText={(value) => onChange((current) => ({ ...current, closingDay: value }))}
        />
      </Field>
      <Field colors={colors} label="Vencimento">
        <TextInput
          style={[styles.input, modalInputStyle(colors)]}
          keyboardType="numeric"
          value={draft.dueDay}
          onChangeText={(value) => onChange((current) => ({ ...current, dueDay: value }))}
        />
      </Field>
      <ModalActions colors={colors} onClose={onClose} onSave={onSave} saveLabel="Salvar cartao" />
    </Sheet>
  );
}

function CategoryModal({
  visible,
  colors,
  draft,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  colors: typeof lightColors;
  draft: CategoryDraft;
  onChange: React.Dispatch<React.SetStateAction<CategoryDraft>>;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!visible) return null;

  const selectedColor = normalizeHexColor(draft.color) ?? CATEGORY_COLORS[0] ?? "#16a34a";

  return (
    <Sheet title="Nova categoria" colors={colors} onClose={onClose}>
      <Field colors={colors} label="Nome">
        <TextInput
          style={[styles.input, modalInputStyle(colors)]}
          value={draft.name}
          onChangeText={(value) => onChange((current) => ({ ...current, name: value }))}
        />
      </Field>
      <Field colors={colors} label="Cor">
        <View style={styles.colorPickerStack}>
          <View style={[styles.gradientPreview, { borderColor: colors.borderSoft }]}>
            <View style={styles.gradientTrack}>
              {CATEGORY_GRADIENT_COLORS.map((color) => (
                <View key={color} style={[styles.gradientStop, { backgroundColor: color }]} />
              ))}
            </View>
            <View style={styles.colorPreviewRow}>
              <View style={[styles.colorPreviewDot, { backgroundColor: selectedColor }]} />
              <Text style={[styles.colorPreviewText, { color: colors.textStrong }]}>{selectedColor}</Text>
            </View>
          </View>
          <View style={styles.chipWrap}>
            {CATEGORY_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorDot,
                  {
                    backgroundColor: color,
                    borderColor: selectedColor === color ? "#f8fafc" : color,
                  },
                ]}
                onPress={() => onChange((current) => ({ ...current, color }))}
              />
            ))}
          </View>
          <TextInput
            style={[styles.input, modalInputStyle(colors)]}
            value={draft.color}
            placeholder="#22C55E"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            onChangeText={(value) =>
              onChange((current) => ({
                ...current,
                color: formatHexColorInput(value),
              }))
            }
          />
          <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
            Digite qualquer cor em HEX. Ex.: #FF914D
          </Text>
        </View>
      </Field>
      <ModalActions
        colors={colors}
        onClose={onClose}
        onSave={onSave}
        saveLabel="Salvar categoria"
      />
    </Sheet>
  );
}

function IncomeModal({
  visible,
  colors,
  month,
  baseDraft,
  extraDrafts,
  onBaseChange,
  onExtraDraftsChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  colors: typeof lightColors;
  month: string;
  baseDraft: string;
  extraDrafts: IncomeExtraDraft[];
  onBaseChange: React.Dispatch<React.SetStateAction<string>>;
  onExtraDraftsChange: React.Dispatch<React.SetStateAction<IncomeExtraDraft[]>>;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!visible) return null;

  const baseIncome = Math.max(0, parseCurrencyToCents(baseDraft) ?? 0);
  const extrasTotal = extraDrafts.reduce(
    (sum, item) => sum + Math.max(0, parseCurrencyToCents(item.amountText) ?? 0),
    0,
  );
  const totalIncome = baseIncome + extrasTotal;

  return (
    <Sheet title="Renda" colors={colors} onClose={onClose}>
      <Field colors={colors} label="Renda base (R$)">
        <TextInput
          style={[styles.input, modalInputStyle(colors)]}
          keyboardType="numeric"
          placeholder="0,00"
          placeholderTextColor={colors.textMuted}
          value={baseDraft}
          onChangeText={(value) => onBaseChange(maskCurrencyInput(value))}
        />
      </Field>
      <View style={styles.incomeExtrasHeader}>
        <Text style={[styles.fieldLabel, { color: colors.textStrong }]}>Rendas extras</Text>
        <TouchableOpacity
          style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.borderSoft }]}
          onPress={() =>
            onExtraDraftsChange((current) => [...current, makeIncomeExtraDraft()])
          }
        >
          <Text style={[styles.chipText, { color: colors.textStrong }]}>+ Adicionar renda extra</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.incomeExtraList}>
        {extraDrafts.length === 0 ? (
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Use extras para bonus, freela, comissao ou qualquer entrada complementar.
          </Text>
        ) : null}
        {extraDrafts.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.incomeExtraCard,
              { backgroundColor: colors.card, borderColor: colors.borderSoft },
            ]}
          >
            <View style={styles.incomeExtraCardHeader}>
              <Text style={[styles.incomeExtraTitle, { color: colors.textStrong }]}>
                Renda extra {index + 1}
              </Text>
              <TouchableOpacity
                style={[styles.incomeExtraRemoveButton, { borderColor: colors.borderSoft }]}
                onPress={() =>
                  onExtraDraftsChange((current) => current.filter((entry) => entry.id !== item.id))
                }
              >
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, modalInputStyle(colors)]}
              placeholder="Descricao"
              placeholderTextColor={colors.textMuted}
              value={item.description}
              onChangeText={(value) =>
                onExtraDraftsChange((current) =>
                  current.map((entry) =>
                    entry.id === item.id ? { ...entry, description: value } : entry,
                  ),
                )
              }
            />
            <TextInput
              style={[styles.input, modalInputStyle(colors)]}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
              value={item.amountText}
              onChangeText={(value) =>
                onExtraDraftsChange((current) =>
                  current.map((entry) =>
                    entry.id === item.id ? { ...entry, amountText: maskCurrencyInput(value) } : entry,
                  ),
                )
              }
            />
          </View>
        ))}
      </View>
      <View style={[styles.incomeTotalCard, { backgroundColor: colors.card, borderColor: colors.borderSoft }]}>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          Total de renda em {monthLabel(month).split(" de ")[0]?.toLowerCase() ?? month}
        </Text>
        <Text style={[styles.incomeTotalValue, { color: colors.textStrong }]}>
          {formatCurrency(totalIncome)}
        </Text>
      </View>
      <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
        Renda base e extras entram juntas no comparativo com todos os gastos do mes.
      </Text>
      <ModalActions colors={colors} onClose={onClose} onSave={onSave} saveLabel="Salvar renda" />
    </Sheet>
  );
}

function SavingsModal({
  visible,
  colors,
  draft,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  colors: typeof lightColors;
  draft: SavingsDraft;
  onChange: React.Dispatch<React.SetStateAction<SavingsDraft>>;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!visible) return null;

  return (
    <Sheet title="Guardar dinheiro" colors={colors} onClose={onClose}>
      <Field colors={colors} label="Descricao">
        <TextInput
          style={[styles.input, modalInputStyle(colors)]}
          placeholder="Ex.: Reserva, viagem, emergencia"
          placeholderTextColor={colors.textMuted}
          value={draft.description}
          onChangeText={(value) => onChange((current) => ({ ...current, description: value }))}
        />
      </Field>
      <Field colors={colors} label="Valor (R$)">
        <TextInput
          style={[styles.input, modalInputStyle(colors)]}
          keyboardType="numeric"
          placeholder="0,00"
          placeholderTextColor={colors.textMuted}
          value={draft.amountText}
          onChangeText={(value) =>
            onChange((current) => ({ ...current, amountText: maskCurrencyInput(value) }))
          }
        />
      </Field>
      <Field colors={colors} label="Como tratar esse valor">
        <View style={styles.chipWrap}>
          <Chip
            colors={colors}
            label="Ja guardado"
            active={draft.alreadySaved}
            onPress={() =>
              onChange((current) => ({
                ...current,
                alreadySaved: !current.alreadySaved,
                deductFromIncome: !current.alreadySaved ? false : current.deductFromIncome,
              }))
            }
          />
          <Chip
            colors={colors}
            label="Retirar da renda mes"
            active={draft.deductFromIncome}
            onPress={() =>
              onChange((current) => ({
                ...current,
                deductFromIncome: !current.deductFromIncome,
                alreadySaved: !current.deductFromIncome ? false : current.alreadySaved,
              }))
            }
          />
        </View>
      </Field>
      <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
        Ja guardado = valor que voce ja tinha. Retirar da renda mes = abate do saldo livre do mes.
      </Text>
      <ModalActions colors={colors} onClose={onClose} onSave={onSave} saveLabel="Salvar valor" />
    </Sheet>
  );
}

function Sheet({
  title,
  colors,
  children,
  onClose,
}: {
  title: string;
  colors: typeof lightColors;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.overlayBackdrop} onPress={onClose} />
      <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.modalHeaderRow,
            { backgroundColor: colors.background, borderBottomColor: colors.borderSoft },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.modalBackButton,
              { backgroundColor: colors.card, borderColor: colors.borderSoft },
            ]}
            onPress={onClose}
          >
            <ArrowLeft size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.modalTitleWrap}>
            <Text style={[styles.modalTitle, { color: colors.textStrong }]}>{title}</Text>
          </View>
          <View style={styles.modalBackSpacer} />
        </View>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ModalActions({
  colors,
  onClose,
  onSave,
  saveLabel,
}: {
  colors: typeof lightColors;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <View style={styles.modalActions}>
      <TouchableOpacity
        style={[
          styles.secondaryButton,
          { backgroundColor: colors.background, borderColor: colors.borderSoft },
        ]}
        onPress={onClose}
      >
        <Text style={[styles.secondaryButtonText, { color: colors.textStrong }]}>Cancelar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={onSave}
      >
        <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>{saveLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Field({
  colors,
  label,
  children,
}: {
  colors: typeof lightColors;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textStrong }]}>{label}</Text>
      {children}
    </View>
  );
}

function DropdownField({
  colors,
  options,
  selectedValue,
  isOpen,
  onToggle,
  onSelect,
}: {
  colors: typeof lightColors;
  options: Array<{ value: string; label: string }>;
  selectedValue: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  const selectedLabel =
    options.find((option) => option.value === selectedValue)?.label ?? "Selecione";

  return (
    <View
      style={[
        styles.selectList,
        { backgroundColor: colors.background, borderColor: colors.borderSoft },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.selectListTrigger,
          { backgroundColor: colors.card, borderColor: colors.borderSoft },
        ]}
        onPress={onToggle}
      >
        <Text style={[styles.selectListLabel, { color: colors.textStrong }]}>{selectedLabel}</Text>
        <ChevronDown
          size={16}
          color={colors.textMuted}
          style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
        />
      </TouchableOpacity>
      {isOpen ? (
        <View style={styles.selectListOptions}>
          {options.map((option) => {
            const active = option.value === selectedValue;

            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.selectListItem,
                  {
                    backgroundColor: active ? colors.chipActiveBg : "transparent",
                    borderColor: active ? colors.chipActiveBorder : "transparent",
                  },
                ]}
                onPress={() => onSelect(option.value)}
              >
                <Text
                  style={[
                    styles.selectListLabel,
                    { color: active ? colors.chipActiveText : colors.textStrong },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function SectionTitle({
  colors = lightColors,
  title,
  subtitle,
}: {
  colors?: typeof lightColors;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textStrong }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

function SummaryBox({
  colors = lightColors,
  title,
  value,
  highlight = false,
  darkPanel = false,
  compact = false,
  meta,
  accentColor,
  progress,
  active = false,
  onPress,
  donutItems,
  donutActiveKey,
  onDonutHover,
  onDonutPress,
}: {
  colors?: typeof lightColors;
  title: string;
  value: string;
  highlight?: boolean;
  darkPanel?: boolean;
  compact?: boolean;
  meta?: string;
  accentColor?: string;
  progress?: number;
  active?: boolean;
  onPress?: () => void;
  donutItems?: PaymentChartItem[];
  donutActiveKey?: PaymentMethod | null;
  onDonutHover?: (method: PaymentMethod | null) => void;
  onDonutPress?: (method: PaymentMethod) => void;
}) {
  const zeroBarColor = "#52525b";
  const zeroTrackColor = "#52525b";
  const donutHasValue = Boolean(donutItems?.some((item) => item.value > 0 && item.percentage > 0));
  const donutGradient = useMemo(() => {
    if (!donutItems?.length) return null;

    let currentAngle = 0;
    const segments = donutItems.flatMap((item) => {
      if (item.value <= 0) return [];

      const start = currentAngle;
      const sweep = item.percentage * 360;
      currentAngle += sweep;

      return [`${item.color} ${start}deg ${currentAngle}deg`];
    });

    if (currentAngle < 360) {
      segments.push(
        `${donutHasValue ? darkColors.borderSoft : zeroBarColor} ${currentAngle}deg 360deg`,
      );
    }

    return `conic-gradient(from -90deg, ${segments.join(", ")})`;
  }, [donutHasValue, donutItems]);

  const content = (
    <View
      style={[
        styles.summaryBox,
        compact ? styles.summaryBoxCompactInner : null,
        darkPanel && donutItems?.length ? styles.summaryBoxWithDonut : null,
        {
          backgroundColor: darkPanel ? darkColors.card : highlight ? colors.primary : colors.card,
          borderColor: active
            ? accentColor || colors.primary
            : darkPanel
              ? darkColors.borderSoft
              : highlight
                ? colors.primary
                : colors.borderSoft,
        },
      ]}
    >
      <View style={darkPanel && donutItems?.length ? styles.summaryBoxMainRow : null}>
        <View style={darkPanel && donutItems?.length ? styles.summaryBoxInfo : null}>
          <View style={styles.summaryBoxHeader}>
            <Text
              style={[
                styles.summaryTitle,
                compact ? styles.summaryTitleCompact : null,
                {
                  color: darkPanel
                    ? darkColors.textMuted
                    : highlight
                      ? colors.primaryText
                      : active
                        ? colors.textStrong
                        : colors.textMuted,
                },
              ]}
            >
              {title}
            </Text>
            {accentColor ? (
              <View
                style={[
                  styles.summaryAccentDot,
                  { backgroundColor: accentColor, opacity: active ? 1 : 0.9 },
                ]}
              />
            ) : null}
          </View>
          <Text
            style={[
              styles.summaryValue,
              compact ? styles.summaryValueCompact : null,
              {
                color: darkPanel
                  ? darkColors.textStrong
                  : highlight
                    ? colors.primaryText
                    : colors.textStrong,
              },
            ]}
          >
            {value}
          </Text>
          {typeof progress === "number" ? (
            <View
              style={[
                styles.summaryMiniChartTrack,
                compact ? styles.summaryMiniChartTrackCompact : null,
                {
                  backgroundColor: darkPanel
                    ? progress <= 0
                      ? zeroTrackColor
                      : darkColors.borderSoft
                    : highlight
                      ? "rgba(255,255,255,0.22)"
                      : progress <= 0
                        ? zeroTrackColor
                        : colors.borderSoft,
                },
              ]}
            >
              <View
                style={[
                  styles.summaryMiniChartFill,
                  {
                    width: progress <= 0 ? "100%" : `${Math.max(progress * 100, 8)}%`,
                    backgroundColor: progress <= 0 ? zeroBarColor : accentColor || colors.primary,
                  },
                ]}
              />
            </View>
          ) : null}
          {meta ? (
            <Text
              style={[
                styles.summaryMeta,
                compact ? styles.summaryMetaCompact : null,
                {
                  color: darkPanel
                    ? darkColors.textMuted
                    : highlight
                      ? colors.primaryText
                      : active
                        ? colors.textStrong
                        : colors.textMuted,
                },
              ]}
            >
              {meta}
            </Text>
          ) : null}
        </View>

        {darkPanel && donutItems?.length ? (
          Platform.OS === "web" && donutGradient ? (
            <div style={webDonutShellStyle}>
              <div style={{ ...webDonutRingStyle, background: donutGradient }}>
                <div style={webDonutHoleStyle}>
                  <span style={stylesWeb.donutCenterLabel}>
                    {donutActiveKey ? PAYMENT_LABELS[donutActiveKey] : "Total"}
                  </span>
                  <span style={stylesWeb.donutCenterValue}>
                    {donutActiveKey
                      ? `${Math.round((donutItems.find((item) => item.key === donutActiveKey)?.percentage ?? 0) * 100)}%`
                      : donutHasValue
                        ? "100%"
                        : "0%"}
                  </span>
                </div>
              </div>
              {donutItems
                .filter((item) => item.value > 0 && item.percentage > 0)
                .map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onDonutPress?.(item.key)}
                    style={{
                      ...stylesWeb.donutHitArea,
                      ...(index === 0
                        ? stylesWeb.donutHitTop
                        : index === 1
                          ? stylesWeb.donutHitRight
                          : index === 2
                            ? stylesWeb.donutHitBottom
                            : stylesWeb.donutHitLeft),
                    }}
                  />
                ))}
            </div>
          ) : (
            <View style={styles.summaryDonutFallback}>
              <View style={styles.summaryDonutHole}>
                <Text style={[styles.summaryDonutCenterLabel, { color: darkColors.textMuted }]}>
                  {donutActiveKey ? PAYMENT_LABELS[donutActiveKey] : "Total"}
                </Text>
                <Text style={[styles.summaryDonutCenterValue, { color: darkColors.textStrong }]}>
                  {donutActiveKey
                    ? `${Math.round((donutItems.find((item) => item.key === donutActiveKey)?.percentage ?? 0) * 100)}%`
                    : donutHasValue
                      ? "100%"
                      : "0%"}
                </Text>
              </View>
            </View>
          )
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={compact ? styles.summaryBoxCompact : null}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function IncomeSummaryCard({
  colors,
  income,
  spent,
  savedFromIncome,
  month,
  onPress,
}: {
  colors: typeof lightColors;
  income: number;
  spent: number;
  savedFromIncome: number;
  month: string;
  onPress: () => void;
}) {
  const usageRatio = income > 0 ? Math.min(spent / income, 1) : 0;
  const freeIncome = Math.max(income - spent, 0);
  const exceeded = Math.max(spent - income, 0);
  const isConfigured = income > 0;
  const usagePercent = income > 0 ? (spent / income) * 100 : 0;
  const incomeProgressColor =
    usagePercent >= 100
      ? "#ef4444"
      : usagePercent >= 85
        ? "#f97316"
        : usagePercent >= 60
          ? "#eab308"
          : "#22c55e";
  const saldoLivreText =
    exceeded > 0 ? `- ${formatCurrency(exceeded)}` : formatCurrency(freeIncome);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[styles.incomeCard, { backgroundColor: colors.card, borderColor: colors.borderSoft }]}
      onPress={onPress}
    >
      <View style={styles.incomeCardTop}>
        <View style={styles.summaryBoxHeader}>
          <Text style={[styles.summaryTitle, { color: colors.textMuted }]}>Renda do mes</Text>
          <Text style={[styles.incomeCardLink, { color: colors.primary }]}>
            {isConfigured ? "Editar" : "Configurar"}
          </Text>
        </View>
        <Text style={[styles.incomeCardValue, { color: colors.textStrong }]}>
          {formatCurrency(income)}
        </Text>
      </View>
      <View style={styles.incomeCardStats}>
        <View style={styles.incomeStatBlock}>
          <Text style={[styles.incomeStatLabel, { color: colors.textMuted }]}>
            {savedFromIncome > 0 ? "Gastos + guardado" : "Gastos"}
          </Text>
          <Text style={[styles.incomeStatValue, { color: colors.textStrong }]}>
            {formatCurrency(spent)}
          </Text>
        </View>
        <View style={[styles.incomeStatBlock, styles.incomeStatBlockRight]}>
          <Text style={[styles.incomeStatLabel, { color: colors.textMuted }]}>Saldo livre</Text>
          <Text
            style={[styles.incomeStatValue, { color: exceeded > 0 ? "#ef4444" : colors.primary }]}
          >
            {saldoLivreText}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.incomeProgressTrack,
          { backgroundColor: isConfigured ? colors.borderSoft : "#52525b" },
        ]}
      >
        {isConfigured ? (
          <View
            style={[
              styles.incomeProgressFill,
              {
                width: `${Math.max(usageRatio * 100, 4)}%`,
                backgroundColor: incomeProgressColor,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.incomeProgressEmpty,
              { borderColor: "#52525b", backgroundColor: "#52525b" },
            ]}
          />
        )}
      </View>
      <Text style={[styles.incomeCardMeta, { color: colors.textMuted }]}>
        {isConfigured
          ? savedFromIncome > 0
            ? `${formatCurrency(savedFromIncome)} foi retirado da renda de ${monthLabel(month).split(" de ")[0]?.toLowerCase() ?? month}`
            : `${Math.round(usagePercent)}% da renda de ${monthLabel(month).split(" de ")[0]?.toLowerCase() ?? month} foi usada`
          : "Toque aqui para definir a renda deste mes e comparar com todos os gastos"}
      </Text>
    </TouchableOpacity>
  );
}

function GroupSection({
  colors = lightColors,
  title,
  groups,
}: {
  colors?: typeof lightColors;
  title: string;
  groups: ReturnType<typeof totalsByCategory>;
}) {
  return (
    <View
      style={[
        styles.groupSection,
        { backgroundColor: colors.card, borderColor: colors.borderSoft },
      ]}
    >
      <SectionTitle colors={colors} title={title} />
      {groups.length === 0 ? (
        <EmptyCard colors={colors} text="Sem dados neste mes." />
      ) : (
        groups.map((item) => (
          <View key={item.id} style={styles.groupRow}>
            <View style={styles.groupRowTop}>
              <Text style={[styles.groupLabel, { color: colors.textStrong }]}>{item.label}</Text>
              <Text style={[styles.groupValue, { color: colors.textStrong }]}>
                {formatCurrency(item.total)}
              </Text>
            </View>
            <View style={[styles.groupBarTrack, { backgroundColor: colors.borderSoft }]}>
              <View style={[styles.groupBarFill, { width: "100%", backgroundColor: item.color }]} />
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function ExpenseRow({
  colors = lightColors,
  entry,
  onDelete,
}: {
  colors?: typeof lightColors;
  entry: EntryView;
  onDelete: () => void;
}) {
  const pieces = [
    formatDateBR(entry.expense.expense_date),
    entry.category?.name ?? "Sem categoria",
    PAYMENT_LABELS[entry.expense.payment_method],
  ];

  if (entry.card?.name) pieces.push(entry.card.name);
  if (entry.installment.installment_count > 1) {
    pieces.push(`${entry.installment.installment_number}/${entry.installment.installment_count}`);
  }

  return (
    <View
      style={[styles.expenseRow, { backgroundColor: colors.card, borderColor: colors.borderSoft }]}
    >
      <View style={styles.expenseMain}>
        <View style={styles.expenseTitleRow}>
          <MiniExpenseBrandIcon entry={entry} />
          <Text style={[styles.expenseTitle, { color: colors.textStrong }]}>
            {entry.expense.description}
          </Text>
        </View>
        <Text style={[styles.expenseMeta, { color: colors.textMuted }]}>{pieces.join(" - ")}</Text>
      </View>
      <View style={styles.expenseSide}>
        <Text style={[styles.expenseAmount, { color: colors.textStrong }]}>
          {formatCurrency(entry.installment.amount)}
        </Text>
        <TouchableOpacity onPress={onDelete}>
          <Text style={styles.deleteText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyCard({
  colors = lightColors,
  icon,
  title,
  text,
  actionLabel,
  onAction,
}: {
  colors?: typeof lightColors;
  icon?: React.ReactNode;
  title?: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={[
        styles.emptyCard,
        { backgroundColor: colors.background, borderColor: colors.borderSoft },
      ]}
    >
      {icon ? <View style={styles.emptyIcon}>{icon}</View> : null}
      {title ? (
        <Text style={[styles.emptyTitle, { color: colors.textStrong }]}>{title}</Text>
      ) : null}
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{text}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={onAction}
        >
          <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Chip({
  label,
  onPress,
  active = false,
  colors = lightColors,
  subtle = false,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  colors?: typeof lightColors;
  subtle?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.chipActiveBg : colors.chipBg,
          borderColor: active ? colors.chipActiveBorder : colors.chipBorder,
          opacity: subtle ? 0.96 : 1,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, { color: active ? colors.chipActiveText : colors.chipText }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, width: "100%", height: "100%", minHeight: "100%", backgroundColor: "#f6f4ea" },
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    minHeight: "100%",
    maxWidth: 480,
    alignSelf: "center",
    backgroundColor: "#f6f4ea",
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#4d665d", fontSize: scale(15) },
  header: {
    paddingHorizontal: scale(18),
    paddingTop: scale(12),
    paddingBottom: scale(10),
    backgroundColor: "#f6f4ea",
    borderBottomWidth: 1,
    borderBottomColor: "#e3dfd2",
  },
  headerTitle: { color: "#1f3a31", fontSize: scale(17), fontWeight: "700", lineHeight: scale(20) },
  headerSubtitle: {
    color: "#73857d",
    fontSize: scale(11),
    marginTop: scale(3),
    lineHeight: scale(14),
  },
  headerAmount: { color: "#479a7f", fontSize: scale(24), fontWeight: "700", marginTop: scale(8) },
  headerTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerTitleWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerSubtitleCentered: { textAlign: "center" },
  iconButton: {
    minWidth: scale(58),
    paddingHorizontal: scale(11),
    paddingVertical: scale(7),
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  iconButtonText: { fontSize: scale(11), fontWeight: "700" },
  headerGlyphButton: {
    width: scale(36),
    height: scale(36),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
  },
  headerGlyphSpacer: {
    width: scale(36),
    height: scale(36),
  },
  headerGlyphText: { fontSize: scale(22), lineHeight: scale(22) },
  monthControls: { flexDirection: "row", flexWrap: "wrap", gap: scale(8), marginTop: scale(10) },
  monthHelperRow: { flexDirection: "row", marginTop: scale(12), marginBottom: scale(10) },
  monthSelectorCard: {
    marginTop: scale(12),
    minHeight: scale(54),
    borderRadius: scale(20),
    borderWidth: 1,
    paddingHorizontal: scale(14),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthArrowButton: {
    width: scale(34),
    height: scale(34),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  monthArrow: { fontSize: scale(17), fontWeight: "700" },
  monthSelectorLabel: { fontSize: scale(15), fontWeight: "700", textTransform: "capitalize" },
  tabRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: "#e3dfd2",
    zIndex: 20,
  },
  tabRowInner: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: scale(2),
    paddingHorizontal: scale(10),
    paddingTop: scale(2),
    paddingBottom: scale(2),
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "flex-end", minHeight: scale(48) },
  tabPill: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabPillActive: {
    width: scale(68),
    height: scale(68),
    borderRadius: 999,
    position: "relative",
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(1),
    marginTop: scale(-16),
  },
  tabPillGlow: {
    position: "absolute",
    inset: 0,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#7c3aed",
    backgroundColor: "#050505",
    shadowColor: "#7c3aed",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  tabPillInactive: { gap: scale(2), paddingVertical: scale(2) },
  tabIconWrap: {
    width: scale(28),
    height: scale(28),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconWrapActive: {
    width: scale(32),
    height: scale(32),
    marginTop: 0,
  },
  tabIconWrapInactive: { marginTop: scale(2) },
  tabIcon: { fontSize: scale(17), fontWeight: "700" },
  tabLabel: { fontSize: scale(10), fontWeight: "600", textAlign: "center", width: "100%" },
  tabLabelActive: {
    fontSize: scale(11),
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
    marginTop: scale(1),
  },
  tabLabelInactive: { opacity: 0.92 },
  scrollContent: {
    paddingHorizontal: scale(18),
    paddingTop: scale(14),
    paddingBottom: scale(126),
    gap: scale(12),
  },
  sectionStack: { gap: scale(10) },
  sectionHeader: { gap: scale(2) },
  sectionTitle: { color: "#1f3a31", fontSize: scale(17), fontWeight: "700" },
  sectionSubtitle: { color: "#73857d", fontSize: scale(12) },
  authScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: scale(28),
    paddingHorizontal: scale(24),
    paddingBottom: scale(24),
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  authCard: {
    width: "100%",
    maxWidth: scale(344),
    borderWidth: 1,
    borderRadius: scale(28),
    paddingHorizontal: scale(16),
    paddingTop: scale(14),
    paddingBottom: scale(14),
    gap: scale(10),
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  authTopBlock: {
    alignItems: "center",
    gap: scale(1),
    marginBottom: scale(0),
  },
  authBrandWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "92%",
    minHeight: scale(58),
    borderRadius: scale(22),
    backgroundColor: "#050505",
    paddingTop: scale(2),
  },
  authLogo: {
    width: scale(224),
    height: scale(74),
  },
  authTitle: { fontSize: scale(26), fontWeight: "800", textAlign: "center" },
  authSubtitle: {
    fontSize: scale(12),
    lineHeight: scale(16),
    textAlign: "center",
    paddingHorizontal: scale(18),
    maxWidth: scale(236),
    marginTop: scale(-2),
  },
  authFormBlock: {
    gap: scale(8),
    paddingHorizontal: scale(4),
    paddingTop: scale(0),
    marginTop: scale(-2),
  },
  authField: {
    gap: scale(4),
  },
  authFieldLabel: {
    fontSize: scale(12),
    fontWeight: "600",
    letterSpacing: 0.2,
    marginLeft: scale(2),
  },
  authInput: {
    minHeight: scale(50),
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    fontSize: scale(14),
  },
  authPrimaryButton: {
    minHeight: scale(54),
    borderRadius: scale(16),
    justifyContent: "center",
    marginHorizontal: scale(4),
    marginTop: scale(2),
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  authPrimaryButtonText: {
    fontSize: scale(17),
    letterSpacing: 0.1,
    fontWeight: "600",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: scale(10),
  },
  incomeCard: {
    borderWidth: 1,
    borderRadius: scale(18),
    padding: scale(16),
    gap: scale(12),
    shadowColor: "#214337",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  incomeCardTop: { gap: scale(10) },
  incomeCardLink: { fontSize: scale(11), lineHeight: scale(14), fontWeight: "700" },
  incomeCardValue: { fontSize: scale(18), lineHeight: scale(22), fontWeight: "700" },
  incomeCardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: scale(14),
  },
  incomeStatBlock: { flex: 1, gap: scale(5) },
  incomeStatBlockRight: { alignItems: "flex-end" },
  incomeStatLabel: { fontSize: scale(11), lineHeight: scale(14), fontWeight: "600" },
  incomeStatValue: { fontSize: scale(13), lineHeight: scale(17), fontWeight: "700" },
  incomeProgressTrack: {
    height: scale(8),
    borderRadius: 999,
    overflow: "hidden",
    marginTop: scale(2),
  },
  incomeProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  incomeProgressEmpty: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  incomeProgressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(10),
  },
  incomeProgressLabel: { fontSize: scale(10), fontWeight: "600" },
  incomeCardMeta: {
    fontSize: scale(11),
    fontWeight: "600",
    lineHeight: scale(15),
    marginTop: scale(1),
  },
  incomeExtrasHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale(10),
  },
  incomeExtraList: { gap: scale(10) },
  incomeExtraCard: {
    borderWidth: 1,
    borderRadius: scale(18),
    padding: scale(12),
    gap: scale(10),
  },
  incomeExtraCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale(10),
  },
  incomeExtraTitle: { fontSize: scale(13), fontWeight: "700" },
  incomeExtraRemoveButton: {
    width: scale(34),
    height: scale(34),
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  incomeTotalCard: {
    borderWidth: 1,
    borderRadius: scale(18),
    padding: scale(14),
    gap: scale(6),
  },
  incomeTotalValue: { fontSize: scale(18), lineHeight: scale(22), fontWeight: "800" },
  savingsSummaryCard: {
    borderWidth: 1,
    borderRadius: scale(18),
    padding: scale(16),
    gap: scale(8),
  },
  savingsSummaryValue: { fontSize: scale(22), lineHeight: scale(26), fontWeight: "800" },
  summaryBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e6dfd4",
    borderRadius: scale(18),
    padding: scale(16),
    gap: scale(12),
    minHeight: scale(126),
    justifyContent: "space-between",
    shadowColor: "#214337",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  summaryBoxWithDonut: {
    minHeight: scale(108),
  },
  summaryBoxMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: scale(16),
  },
  summaryBoxInfo: {
    flex: 1,
    gap: scale(10),
  },
  summaryBoxCompact: { width: "48.5%", minHeight: scale(76) },
  summaryBoxCompactInner: {
    minHeight: scale(76),
    padding: scale(12),
    gap: scale(5),
    justifyContent: "flex-start",
  },
  summaryBoxHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  summaryBoxHighlight: { backgroundColor: "#4c9d83", borderColor: "#4c9d83" },
  summaryAccentDot: { width: scale(10), height: scale(10), borderRadius: 999 },
  summaryTitle: { color: "#698177", fontSize: scale(11), lineHeight: scale(14), fontWeight: "600" },
  summaryTitleCompact: { marginBottom: scale(2) },
  summaryValue: { color: "#173127", fontSize: scale(18), lineHeight: scale(22), fontWeight: "700" },
  summaryValueCompact: { marginBottom: scale(2) },
  summaryDonutFallback: {
    width: scale(76),
    height: scale(76),
    borderRadius: 999,
    borderWidth: scale(4),
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryDonutHole: {
    width: scale(58),
    height: scale(58),
    borderRadius: 999,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(1),
  },
  summaryDonutCenterLabel: {
    fontSize: scale(8.5),
    fontWeight: "600",
  },
  summaryDonutCenterValue: { fontSize: scale(13.5), fontWeight: "700" },
  summaryMiniChartTrack: {
    height: scale(8),
    borderRadius: 999,
    overflow: "hidden",
    marginTop: scale(2),
  },
  summaryMiniChartTrackCompact: { marginTop: scale(2), height: scale(7) },
  summaryMiniChartFill: { height: "100%", borderRadius: 999 },
  summaryMeta: {
    fontSize: scale(11),
    fontWeight: "600",
    lineHeight: scale(15),
    marginTop: scale(2),
  },
  summaryMetaCompact: { marginTop: scale(2) },
  groupSection: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e6dfd4",
    borderRadius: scale(18),
    padding: scale(13),
    gap: scale(9),
    shadowColor: "#214337",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  groupRow: { gap: scale(5) },
  groupRowTop: { flexDirection: "row", justifyContent: "space-between", gap: scale(10) },
  groupLabel: { color: "#24473b", fontSize: scale(13), flex: 1, fontWeight: "600" },
  groupValue: { color: "#173127", fontSize: scale(13), fontWeight: "700" },
  groupBarTrack: {
    height: scale(7),
    backgroundColor: "#ebe7dc",
    borderRadius: 999,
    overflow: "hidden",
  },
  groupBarFill: { height: "100%", borderRadius: 999 },
  expenseRow: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e6dfd4",
    borderRadius: scale(18),
    padding: scale(13),
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(10),
    shadowColor: "#214337",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  expenseMain: { flex: 1, gap: scale(4) },
  expenseSide: { alignItems: "flex-end", gap: scale(5) },
  expenseTitleRow: { flexDirection: "row", alignItems: "center", gap: scale(8) },
  expenseTitle: { color: "#173127", fontSize: scale(14), fontWeight: "700" },
  expenseMeta: { color: "#73857d", fontSize: scale(11), lineHeight: scale(16) },
  expenseAmount: { color: "#173127", fontSize: scale(14), fontWeight: "700" },
  expenseBrandIcon: {
    minWidth: scale(24),
    height: scale(24),
    borderRadius: scale(8),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(5),
  },
  expenseBrandIconText: { fontSize: scale(9), fontWeight: "800", letterSpacing: 0.2 },
  deleteText: { color: "#b00020", fontSize: scale(11), fontWeight: "600" },
  bottomActions: { gap: scale(10), marginTop: scale(8) },
  primaryButton: {
    backgroundColor: "#4c9d83",
    paddingVertical: scale(13),
    paddingHorizontal: scale(15),
    borderRadius: scale(15),
    alignItems: "center",
  },
  primaryButtonText: { color: "#f4fff9", fontWeight: "800", fontSize: scale(14) },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ddd6c8",
    paddingVertical: scale(13),
    paddingHorizontal: scale(15),
    borderRadius: scale(15),
    alignItems: "center",
  },
  accessButton: {
    minHeight: scale(44),
    justifyContent: "center",
  },
  actionButtonContent: { flexDirection: "row", alignItems: "center", gap: scale(8) },
  secondaryButtonText: { color: "#34564b", fontWeight: "700", fontSize: scale(14) },
  dangerOutlineButton: {
    shadowColor: "#b00020",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dangerButton: {
    backgroundColor: "#3f0d17",
    borderWidth: 1,
    borderColor: "#881337",
    paddingVertical: scale(13),
    paddingHorizontal: scale(15),
    borderRadius: scale(12),
    alignItems: "center",
  },
  dangerButtonText: { color: "#fecdd3", fontWeight: "700", fontSize: scale(14) },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: scale(8) },
  colorPickerStack: { gap: scale(10) },
  gradientPreview: {
    borderWidth: 1,
    borderRadius: scale(18),
    padding: scale(10),
    gap: scale(10),
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  gradientTrack: {
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 999,
    height: scale(18),
  },
  gradientStop: { flex: 1 },
  colorPreviewRow: { flexDirection: "row", alignItems: "center", gap: scale(10) },
  colorPreviewDot: {
    width: scale(26),
    height: scale(26),
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  colorPreviewText: { fontSize: scale(13), fontWeight: "700", letterSpacing: 0.4 },
  chip: {
    paddingVertical: scale(9),
    paddingHorizontal: scale(13),
    borderRadius: 999,
    backgroundColor: "#eeece2",
    borderWidth: 1,
    borderColor: "#e0dbcf",
  },
  chipText: { color: "#49645b", fontSize: scale(12), fontWeight: "600" },
  fieldStack: { gap: scale(8) },
  selectList: {
    borderWidth: 1,
    borderRadius: scale(16),
    padding: scale(6),
    gap: scale(6),
  },
  selectListTrigger: {
    minHeight: scale(42),
    borderWidth: 1,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale(10),
  },
  selectListOptions: { gap: scale(6) },
  selectListItem: {
    minHeight: scale(42),
    borderWidth: 1,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    justifyContent: "center",
  },
  selectListLabel: { fontSize: scale(13), fontWeight: "600" },
  field: { gap: scale(7), marginBottom: scale(13) },
  fieldLabel: { color: "#24473b", fontSize: scale(13), fontWeight: "600" },
  fieldHint: { fontSize: scale(11), lineHeight: scale(15), marginTop: scale(4) },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ddd6c8",
    borderRadius: scale(15),
    color: "#173127",
    paddingHorizontal: scale(13),
    paddingVertical: scale(11),
    fontSize: scale(14),
  },
  textArea: { minHeight: scale(90), textAlignVertical: "top" },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(25, 39, 33, 0.48)",
    zIndex: 50,
  },
  overlayBackdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  modalSafeArea: { flex: 1, backgroundColor: "#f6f4ea" },
  modalScroll: { flex: 1 },
  modalContent: { padding: scale(18), paddingBottom: scale(32) },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(18),
    paddingTop: scale(10),
    paddingBottom: scale(10),
    borderBottomWidth: 1,
  },
  modalBackButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  modalBackSpacer: { width: scale(36), height: scale(36) },
  modalTitleWrap: { flex: 1, alignItems: "center" },
  modalTitle: {
    color: "#173127",
    fontSize: scale(17),
    fontWeight: "700",
    textAlign: "center",
    lineHeight: scale(20),
  },
  modalActions: { flexDirection: "row", gap: scale(10), marginTop: scale(8) },
  emptyCard: {
    backgroundColor: "#fffdfa",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d8d2c6",
    borderRadius: scale(18),
    padding: scale(16),
    alignItems: "center",
    gap: scale(10),
  },
  emptyIcon: { alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: scale(17), fontWeight: "700", textAlign: "center" },
  emptyText: { color: "#73857d", fontSize: scale(13) },
  cardRow: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e6dfd4",
    borderLeftWidth: 4,
    borderRadius: scale(18),
    padding: scale(13),
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(10),
    shadowColor: "#214337",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardRowContent: { flex: 1, gap: scale(4) },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: scale(8) },
  cardTitle: { color: "#173127", fontSize: scale(14), fontWeight: "700" },
  cardMeta: { color: "#73857d", fontSize: scale(11), lineHeight: scale(16) },
  cardFlag: {
    minWidth: scale(32),
    height: scale(20),
    borderRadius: scale(8),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(5),
  },
  cardFlagText: { fontSize: scale(8), fontWeight: "800", letterSpacing: 0.3 },
  cardFlagMasterWrap: {
    width: scale(18),
    height: scale(10),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cardFlagMasterCircle: {
    width: scale(10),
    height: scale(10),
    borderRadius: 999,
  },
  cardFlagMasterOverlap: { marginLeft: scale(-3) },
  colorDot: { width: scale(26), height: scale(26), borderRadius: 999, borderWidth: 3 },
  floatingAction: {
    position: "absolute",
    right: scale(18),
    bottom: scale(82),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    borderRadius: 999,
    width: scale(54),
    height: scale(54),
    shadowColor: "#7c3aed",
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  floatingActionPlus: { color: "#f7fffb", fontSize: scale(18), fontWeight: "700", marginTop: -1 },
  floatingActionText: { color: "#f7fffb", fontSize: scale(13), fontWeight: "700" },
});
