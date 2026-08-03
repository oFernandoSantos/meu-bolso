import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "@/components/icons";
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
          className="rounded-full p-2 text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
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
