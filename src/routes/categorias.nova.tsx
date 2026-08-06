import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CategoryForm } from "@/components/CategoryForm";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/categorias/nova")({
  head: () => ({
    meta: [
      { title: "Nova categoria — Meus Gastos" },
      { name: "description", content: "Crie uma categoria com nome, ícone e cor." },
      { property: "og:title", content: "Nova categoria — Meus Gastos" },
      { property: "og:description", content: "Criação de categoria de gastos." },
    ],
  }),
  component: NewCategoryPage,
});

function NewCategoryPage() {
  const navigate = useNavigate();
  const addCategory = useAppStore((state) => state.addCategory);

  return (
    <AppShell
      title="Nova categoria"
      withTabs={false}
      action={
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => navigate({ to: "/categorias" })}
          className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
      }
    >
      <CategoryForm
        submitLabel="Salvar categoria"
        onSubmit={(values) => {
          addCategory(values);
          toast.success("Categoria criada com sucesso");
          navigate({ to: "/categorias" });
        }}
      />
    </AppShell>
  );
}
