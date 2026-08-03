import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatCurrency } from "@/lib/money";
import type { Category } from "@/lib/types";

interface CategoryItemProps {
  category: Category;
  monthTotal: number;
}

export function CategoryItem({ category, monthTotal }: CategoryItemProps) {
  return (
    <Link
      to="/categorias/$id"
      params={{ id: category.id }}
      className="card-soft flex items-center gap-3 px-3.5 py-3 transition-colors active:bg-muted"
    >
      <CategoryIcon icon={category.icon} color={category.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {category.active ? formatCurrency(monthTotal) + " neste mês" : "Inativa"}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
