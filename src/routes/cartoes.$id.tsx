import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CardForm } from "@/components/CardForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { useMonthStore } from "@/store/useMonthStore";
import { useMonthEntries } from "@/hooks/useMonthEntries";
import { cardMonthTotal } from "@/lib/summary";
import { formatCurrency } from "@/lib/money";

export const Route = createFileRoute("/cartoes/$id")({
  head: () => ({
    meta: [
      { title: "Editar cartão — Meus Gastos" },
      { name: "description", content: "Edite limite, cor, fechamento e vencimento do cartão." },
      { property: "og:title", content: "Editar cartão — Meus Gastos" },
      { property: "og:description", content: "Edição e exclusão de cartão." },
    ],
  }),
  component: CardDetailPage,
});

function CardDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const month = useMonthStore((state) => state.month);
  const entries = useMonthEntries(month);
  const card = useAppStore((state) => state.cards.find((item) => item.id === id));
  const updateCard = useAppStore((state) => state.updateCard);
  const deleteCard = useAppStore((state) => state.deleteCard);
  const expenseCount = useAppStore(
    (state) => state.expenses.filter((expense) => expense.card_id === id).length,
  );

  if (!card) {
    return (
      <AppShell title="Cartão" withTabs={false}>
        <EmptyState
          title="Cartão não encontrado"
          description="Ele pode ter sido excluído."
          action={<Button onClick={() => navigate({ to: "/cartoes" })}>Voltar</Button>}
        />
      </AppShell>
    );
  }

  const total = cardMonthTotal(card.id, entries);

  return (
    <AppShell
      title={card.name}
      subtitle={`Gasto do mês: ${formatCurrency(total)}`}
      withTabs={false}
      action={
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => navigate({ to: "/cartoes" })}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </button>
      }
    >
      <div className="space-y-6">
        <CardForm
          submitLabel="Salvar alterações"
          defaultValues={{
            name: card.name,
            institution: card.institution,
            type: card.type,
            credit_limit: card.credit_limit,
            closing_day: card.closing_day,
            due_day: card.due_day,
            color: card.color,
            active: card.active,
          }}
          onSubmit={(values) => {
            updateCard(card.id, values);
            toast.success("Cartão atualizado com sucesso");
            navigate({ to: "/cartoes" });
          }}
        />

        <ConfirmDialog
          title="Excluir cartão?"
          description={
            expenseCount > 0
              ? `Este cartão está em ${expenseCount} gasto(s). Eles continuarão registrados, mas sem cartão.`
              : "Esta ação não pode ser desfeita."
          }
          onConfirm={() => {
            deleteCard(card.id);
            toast.success("Cartão excluído");
            navigate({ to: "/cartoes" });
          }}
          trigger={
            <Button variant="outline" className="h-12 w-full rounded-xl text-destructive">
              <Trash2 className="size-4" /> Excluir cartão
            </Button>
          }
        />
      </div>
    </AppShell>
  );
}
