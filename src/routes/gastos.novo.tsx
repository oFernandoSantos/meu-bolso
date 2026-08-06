import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ExpenseForm } from "@/components/ExpenseForm";
import { useAppStore } from "@/store/useAppStore";
import { useMonthStore } from "@/store/useMonthStore";
import { monthKey } from "@/lib/dates";

export const Route = createFileRoute("/gastos/novo")({
  head: () => ({
    meta: [
      { title: "Novo gasto — Meus Gastos" },
      {
        name: "description",
        content: "Registre um gasto em segundos: valor, descrição, pagamento, cartão e categoria.",
      },
      { property: "og:title", content: "Novo gasto — Meus Gastos" },
      { property: "og:description", content: "Cadastro rápido de gasto com parcelas no crédito." },
    ],
  }),
  component: NewExpensePage,
});

function NewExpensePage() {
  const navigate = useNavigate();
  const addExpense = useAppStore((state) => state.addExpense);
  const setMonth = useMonthStore((state) => state.setMonth);

  return (
    <AppShell
      title="Novo gasto"
      withTabs={false}
      action={
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => navigate({ to: "/" })}
          className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
      }
    >
      <ExpenseForm
        submitLabel="Salvar gasto"
        onSubmit={(values) => {
          addExpense(values);
          setMonth(monthKey(values.expense_date));
          toast.success("Gasto cadastrado com sucesso");
          navigate({ to: "/" });
        }}
      />
    </AppShell>
  );
}
