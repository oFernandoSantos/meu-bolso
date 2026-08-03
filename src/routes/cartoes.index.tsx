import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MonthSelector } from "@/components/MonthSelector";
import { CardItem } from "@/components/CardItem";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useMonthEntries } from "@/hooks/useMonthEntries";
import { useMonthStore } from "@/store/useMonthStore";
import { useAppStore } from "@/store/useAppStore";
import { cardMonthTotal } from "@/lib/summary";

export const Route = createFileRoute("/cartoes/")({
  head: () => ({
    meta: [
      { title: "Cartões — Meus Gastos" },
      {
        name: "description",
        content: "Cartões de crédito e débito com limite, gasto do mês e limite disponível.",
      },
      { property: "og:title", content: "Cartões — Meus Gastos" },
      { property: "og:description", content: "Acompanhe limite e uso de cada cartão no mês." },
    ],
  }),
  component: CardsPage,
});

function CardsPage() {
  const { month, setMonth } = useMonthStore();
  const entries = useMonthEntries(month);
  const cards = useAppStore((state) => state.cards);

  return (
    <AppShell
      title="Cartões"
      subtitle="Limites e gastos do mês"
      action={
        <Link
          to="/cartoes/novo"
          aria-label="Novo cartão"
          className="rounded-full p-2 text-primary hover:bg-muted"
        >
          <Plus className="size-5" />
        </Link>
      }
    >
      <div className="space-y-4">
        <MonthSelector month={month} onChange={setMonth} />

        {cards.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="size-8" />}
            title="Nenhum cartão cadastrado."
            description="Cadastre um cartão para registrar gastos no crédito ou débito."
            action={
              <Button asChild className="rounded-xl">
                <Link to="/cartoes/novo">Cadastrar cartão</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                monthTotal={cardMonthTotal(card.id, entries)}
                creditMonthTotal={cardMonthTotal(card.id, entries, true)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
