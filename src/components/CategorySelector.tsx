import type { Category } from "@/lib/types";
import { CategoryIcon } from "@/components/CategoryIcon";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
}

export function CategorySelector({ categories, value, onChange }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {categories
        .filter((category) => category.active)
        .map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[0.68rem] font-medium transition-colors",
              value === category.id
                ? "border-primary bg-secondary text-secondary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            <CategoryIcon icon={category.icon} color={category.color} size="sm" />
            <span className="w-full truncate text-center">{category.name}</span>
          </button>
        ))}
    </div>
  );
}
