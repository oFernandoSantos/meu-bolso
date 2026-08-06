import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CardForm } from "@/components/CardForm";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/cartoes/novo")({
  head: () => ({
    meta: [
      { title: "Novo cartão — Meus Gastos" },
      { name: "description", content: "Cadastre um cartão de crédito ou débito com limite e cor." },
      { property: "og:title", content: "Novo cartão — Meus Gastos" },
      { property: "og:description", content: "Cadastro de cartão de crédito ou débito." },
    ],
  }),
  component: NewCardPage,
});

function NewCardPage() {
  const navigate = useNavigate();
  const addCard = useAppStore((state) => state.addCard);

  return (
    <AppShell
      title="Novo cartão"
      withTabs={false}
      action={
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => navigate({ to: "/cartoes" })}
          className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
      }
    >
      <CardForm
        submitLabel="Salvar cartão"
        onSubmit={(values) => {
          addCard(values);
          toast.success("Cartão cadastrado com sucesso");
          navigate({ to: "/cartoes" });
        }}
      />
    </AppShell>
  );
}
