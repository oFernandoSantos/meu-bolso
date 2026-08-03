import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MonthSelector } from "@/components/MonthSelector";
import { CategoryItem } from "@/components/CategoryItem";
import { useMonthEntries } from "@/hooks/useMonthEntries";
import { useMonthStore } from "@/store/useMonthStore";
import { useAppStore } from "@/store/useAppStore";
import { totalsByCategory } from "@/lib/summary";

export const Route = createFileRoute("/categorias/")({
  head: () => ({
    meta: [
      { title: "Categorias — Meus Gastos" },
      {
        name: "description",
        content: "Organize seus gastos por categoria com ícone, cor e ativação.",
      },
      { property: "og:title", content: "Categorias — Meus Gastos" },
      { property: "og:description", content: "Crie e edite categorias de gastos." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { month, setMonth } = useMonthStore();
  const entries = useMonthEntries(month);
  const categories = useAppStore((state) => state.categories);
  const totals = new Map(totalsByCategory(entries).map((item) => [item.id, item.total]));

  return (
    <AppShell
      title="Categorias"
      subtitle="Gastos por categoria no mês"
      action={
        <Link
          to="/categorias/nova"
          aria-label="Nova categoria"
          className="rounded-full p-2 text-primary hover:bg-muted"
        >
          <Plus className="size-5" />
        </Link>
      }
    >
      <div className="space-y-4">
        <MonthSelector month={month} onChange={setMonth} />
        <div className="space-y-2.5">
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              monthTotal={totals.get(category.id) ?? 0}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
