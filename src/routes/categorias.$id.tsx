import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CategoryForm } from "@/components/CategoryForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/categorias/$id")({
  head: () => ({
    meta: [
      { title: "Editar categoria — Meus Gastos" },
      { name: "description", content: "Edite nome, ícone, cor ou desative a categoria." },
      { property: "og:title", content: "Editar categoria — Meus Gastos" },
      { property: "og:description", content: "Edição de categoria de gastos." },
    ],
  }),
  component: CategoryDetailPage,
});

function CategoryDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const category = useAppStore((state) => state.categories.find((item) => item.id === id));
  const updateCategory = useAppStore((state) => state.updateCategory);
  const deleteCategory = useAppStore((state) => state.deleteCategory);
  const usageCount = useAppStore(
    (state) => state.expenses.filter((expense) => expense.category_id === id).length,
  );

  if (!category) {
    return (
      <AppShell title="Categoria" withTabs={false}>
        <EmptyState
          title="Categoria não encontrada"
          description="Ela pode ter sido excluída."
          action={<Button onClick={() => navigate({ to: "/categorias" })}>Voltar</Button>}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={category.name}
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
      <div className="space-y-6">
        <CategoryForm
          submitLabel="Salvar alterações"
          defaultValues={{
            name: category.name,
            icon: category.icon,
            color: category.color,
            active: category.active,
          }}
          onSubmit={(values) => {
            updateCategory(category.id, values);
            toast.success("Categoria atualizada com sucesso");
            navigate({ to: "/categorias" });
          }}
        />

        {usageCount === 0 ? (
          <ConfirmDialog
            title="Excluir categoria?"
            description="Esta ação não pode ser desfeita."
            onConfirm={() => {
              deleteCategory(category.id);
              toast.success("Categoria excluída");
              navigate({ to: "/categorias" });
            }}
            trigger={
              <Button variant="outline" className="h-12 w-full rounded-xl text-[#b00020]">
                <Trash2 className="size-4 text-[#b00020]" /> Excluir categoria
              </Button>
            }
          />
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Esta categoria é usada em {usageCount} gasto(s). Desative-a acima em vez de excluir.
          </p>
        )}
      </div>
    </AppShell>
  );
}
