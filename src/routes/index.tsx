import { createFileRoute } from "@tanstack/react-router";
import { Banknote, CreditCard, Landmark, Smartphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MonthSelector } from "@/components/MonthSelector";
import { SummaryCard } from "@/components/SummaryCard";
import { ExpenseItem } from "@/components/ExpenseItem";
import { EmptyState } from "@/components/EmptyState";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useMonthEntries } from "@/hooks/useMonthEntries";
import { useMonthStore } from "@/store/useMonthStore";
import { useAppStore } from "@/store/useAppStore";
import { capitalize, monthName } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import {
  sumEntries,
  totalsByCard,
  totalsByCategory,
  totalsByPaymentMethod,
  type GroupTotal,
} from "@/lib/summary";
import type { EntryView } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meus Gastos — controle de gastos pessoais" },
      {
        name: "description",
        content:
          "Registre gastos em segundos e acompanhe o total do mês por cartão, categoria e forma de pagamento. Dados salvos no seu aparelho.",
      },
      { property: "og:title", content: "Meus Gastos — controle de gastos pessoais" },
      {
        property: "og:description",
        content: "Resumo do mês, gastos parcelados e cartões, tudo salvo localmente.",
      },
    ],
  }),
  component: HomePage,
});

function GroupList({ items, total }: { items: GroupTotal[]; total: number }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const percent = total > 0 ? Math.round((item.total / total) * 100) : 0;
        return (
          <li key={item.id}>
            <div className="flex items-center justify-between text-sm">
              <span className="truncate font-medium">{item.label}</span>
              <span className="num shrink-0 font-semibold">{formatCurrency(item.total)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${percent}%`, backgroundColor: item.color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function HomePage() {
  const { month, setMonth } = useMonthStore();
  const entries = useMonthEntries(month);
  const expenses = useAppStore((state) => state.expenses);
  const categories = useAppStore((state) => state.categories);

  const total = sumEntries(entries);
  const byMethod = totalsByPaymentMethod(entries);
  const byCategory = totalsByCategory(entries);
  const byCard = totalsByCard(entries);

  const latest: EntryView[] = [...entries]
    .sort((a, b) => b.expense.created_at.localeCompare(a.expense.created_at))
    .slice(0, 5);

  return (
    <AppShell title="Início" subtitle="Resumo do mês">
      <div className="space-y-5">
        <MonthSelector month={month} onChange={setMonth} />

        <SummaryCard highlight label={`Total gasto em ${monthName(month)}`} amount={total} />

        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Crédito"
            amount={byMethod.credit}
            icon={<CreditCard className="size-3.5" />}
          />
          <SummaryCard
            label="Débito"
            amount={byMethod.debit}
            icon={<Landmark className="size-3.5" />}
          />
          <SummaryCard
            label="Pix"
            amount={byMethod.pix}
            icon={<Smartphone className="size-3.5" />}
          />
          <SummaryCard
            label="Dinheiro"
            amount={byMethod.cash}
            icon={<Banknote className="size-3.5" />}
          />
        </div>
        {byMethod.other > 0 ? <SummaryCard label="Outro" amount={byMethod.other} /> : null}

        {byCategory.length > 0 ? (
          <section className="card-soft p-4">
            <h2 className="mb-3 text-sm font-semibold">Gastos por categoria</h2>
            <GroupList items={byCategory} total={total} />
          </section>
        ) : null}

        {byCard.length > 0 ? (
          <section className="card-soft p-4">
            <h2 className="mb-3 text-sm font-semibold">Gastos por cartão</h2>
            <GroupList items={byCard} total={total} />
          </section>
        ) : null}

        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold">Últimos gastos</h2>
          {latest.length === 0 ? (
            <EmptyState
              icon={
                <CategoryIcon
                  icon={categories[0]?.icon ?? "wallet"}
                  color={categories[0]?.color ?? "#16a34a"}
                />
              }
              title="Nenhum gasto registrado neste mês."
              description={
                expenses.length === 0
                  ? "Toque no botão + para adicionar seu primeiro gasto."
                  : `Nada em ${capitalize(monthName(month))}. Toque no botão + para adicionar.`
              }
            />
          ) : (
            latest.map((entry) => <ExpenseItem key={entry.installment.id} entry={entry} />)
          )}
        </section>
      </div>
      <FloatingAddButton />
    </AppShell>
  );
}
