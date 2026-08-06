import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownUp, Receipt, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MonthSelector } from "@/components/MonthSelector";
import { ExpenseItem } from "@/components/ExpenseItem";
import { EmptyState } from "@/components/EmptyState";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMonthEntries } from "@/hooks/useMonthEntries";
import { useMonthStore } from "@/store/useMonthStore";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency } from "@/lib/money";
import { sumEntries } from "@/lib/summary";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/types";

export const Route = createFileRoute("/gastos/")({
  head: () => ({
    meta: [
      { title: "Gastos do mês — Meus Gastos" },
      {
        name: "description",
        content: "Lista completa dos gastos do mês com filtros por categoria, pagamento e cartão.",
      },
      { property: "og:title", content: "Gastos do mês — Meus Gastos" },
      {
        property: "og:description",
        content: "Filtre, ordene, edite e exclua seus gastos do mês.",
      },
    ],
  }),
  component: ExpensesPage,
});

type SortOption = "recent" | "oldest" | "highest" | "lowest";

function ExpensesPage() {
  const { month, setMonth } = useMonthStore();
  const entries = useMonthEntries(month);
  const cards = useAppStore((state) => state.cards);
  const categories = useAppStore((state) => state.categories);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [method, setMethod] = useState("all");
  const [card, setCard] = useState("all");
  const [sort, setSort] = useState<SortOption>("recent");

  const filtered = entries
    .filter((entry) => {
      if (search && !entry.expense.description.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (category !== "all" && entry.expense.category_id !== category) return false;
      if (method !== "all" && entry.expense.payment_method !== (method as PaymentMethod)) {
        return false;
      }
      if (card !== "all" && entry.expense.card_id !== card) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.expense.expense_date.localeCompare(b.expense.expense_date);
        case "highest":
          return b.installment.amount - a.installment.amount;
        case "lowest":
          return a.installment.amount - b.installment.amount;
        default:
          return b.expense.expense_date.localeCompare(a.expense.expense_date);
      }
    });

  return (
    <AppShell
      title="Gastos"
      subtitle={`${filtered.length} lançamentos · ${formatCurrency(sumEntries(filtered))}`}
    >
      <div className="space-y-4">
        <MonthSelector month={month} onChange={setMonth} />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar pela descrição"
            className="h-11 rounded-xl pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pagamentos</SelectItem>
              {PAYMENT_METHODS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={card} onValueChange={setCard}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Cartão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cartões</SelectItem>
              {cards.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
            <SelectTrigger className="h-10 rounded-xl">
              <ArrowDownUp className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recente</SelectItem>
              <SelectItem value="oldest">Mais antigo</SelectItem>
              <SelectItem value="highest">Maior valor</SelectItem>
              <SelectItem value="lowest">Menor valor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Receipt className="size-8" />}
              title="Nenhum gasto registrado neste mês."
              description="Toque no botão + para adicionar seu primeiro gasto."
              action={
                <Link to="/gastos/novo" className="text-sm font-medium text-primary underline">
                  Registrar gasto
                </Link>
              }
            />
          ) : (
            filtered.map((entry) => <ExpenseItem key={entry.installment.id} entry={entry} />)
          )}
        </div>
      </div>
      <FloatingAddButton />
    </AppShell>
  );
}
