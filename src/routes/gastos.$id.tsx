import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CategoryIcon } from "@/components/CategoryIcon";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { formatDateBR, monthLabel, capitalize } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { PAYMENT_LABELS } from "@/lib/types";

export const Route = createFileRoute("/gastos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do gasto — Meus Gastos" },
      {
        name: "description",
        content: "Veja, edite ou exclua um gasto registrado, incluindo suas parcelas.",
      },
      { property: "og:title", content: "Detalhes do gasto — Meus Gastos" },
      { property: "og:description", content: "Detalhes, edição e exclusão de um gasto." },
    ],
  }),
  component: ExpenseDetailPage,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 last:border-none">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function ExpenseDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const expense = useAppStore((state) => state.expenses.find((item) => item.id === id));
  const installments = useAppStore((state) =>
    state.installments.filter((item) => item.expense_id === id),
  );
  const card = useAppStore((state) => state.cards.find((item) => item.id === expense?.card_id));
  const category = useAppStore((state) =>
    state.categories.find((item) => item.id === expense?.category_id),
  );
  const updateExpense = useAppStore((state) => state.updateExpense);
  const deleteExpense = useAppStore((state) => state.deleteExpense);

  if (!expense) {
    return (
      <AppShell title="Gasto" withTabs={false}>
        <EmptyState
          title="Gasto não encontrado"
          description="Ele pode ter sido excluído."
          action={
            <Button onClick={() => navigate({ to: "/gastos" })}>Voltar para os gastos</Button>
          }
        />
      </AppShell>
    );
  }

  const backButton = (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (editing ? setEditing(false) : navigate({ to: "/gastos" }))}
      className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
    </button>
  );

  if (editing) {
    return (
      <AppShell title="Editar gasto" withTabs={false} action={backButton}>
        <ExpenseForm
          submitLabel="Salvar alterações"
          defaultValues={{
            description: expense.description,
            total_amount: expense.total_amount,
            expense_date: expense.expense_date,
            payment_method: expense.payment_method,
            card_id: expense.card_id,
            category_id: expense.category_id,
            installment_count: expense.installment_count,
            notes: expense.notes,
          }}
          onSubmit={(values) => {
            updateExpense(expense.id, values);
            toast.success("Gasto atualizado com sucesso");
            setEditing(false);
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Detalhes do gasto" withTabs={false} action={backButton}>
      <div className="space-y-5">
        <div className="card-soft flex items-center gap-3 p-4">
          <CategoryIcon
            icon={category?.icon ?? "circle-dashed"}
            color={category?.color ?? "#64748b"}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{expense.description}</p>
            <p className="text-xs text-muted-foreground">{category?.name ?? "Sem categoria"}</p>
          </div>
          <p className="num text-lg font-bold">{formatCurrency(expense.total_amount)}</p>
        </div>

        <div className="card-soft px-4 py-2">
          <Row label="Data" value={formatDateBR(expense.expense_date)} />
          <Row label="Pagamento" value={PAYMENT_LABELS[expense.payment_method]} />
          {card ? <Row label="Cartão" value={card.name} /> : null}
          <Row label="Parcelas" value={String(expense.installment_count)} />
          {expense.notes ? <Row label="Observação" value={expense.notes} /> : null}
        </div>

        {installments.length > 1 ? (
          <section className="card-soft p-4">
            <h2 className="mb-2 text-sm font-semibold">Parcelas</h2>
            <ul className="space-y-1.5">
              {installments
                .sort((a, b) => a.installment_number - b.installment_number)
                .map((installment) => (
                  <li key={installment.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {installment.installment_number}/{installment.installment_count} ·{" "}
                      {capitalize(monthLabel(installment.competence_month))}
                    </span>
                    <span className="num font-medium">{formatCurrency(installment.amount)}</span>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        <div className="flex gap-3">
          <Button className="h-12 flex-1 rounded-xl" onClick={() => setEditing(true)}>
            <Pencil className="size-4" /> Editar
          </Button>
          <ConfirmDialog
            title="Excluir gasto?"
            description={
              installments.length > 1
                ? `Todas as ${installments.length} parcelas serão excluídas.`
                : "Esta ação não pode ser desfeita."
            }
            onConfirm={() => {
              deleteExpense(expense.id);
              toast.success("Gasto excluído");
              navigate({ to: "/gastos" });
            }}
            trigger={
              <Button variant="outline" className="h-12 flex-1 rounded-xl text-[#b00020]">
                <Trash2 className="size-4 text-[#b00020]" /> Excluir
              </Button>
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
