import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { categorySchema, type CategoryFormValues } from "@/lib/schemas";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_ICON_KEYS,
  CategoryIcon,
} from "@/components/CategoryIcon";
import { cn } from "@/lib/utils";

interface CategoryFormProps {
  defaultValues?: Partial<CategoryFormValues>;
  submitLabel: string;
  onSubmit: (values: CategoryFormValues) => void;
}

export function CategoryForm({ defaultValues, submitLabel, onSubmit }: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      icon: "circle-dashed",
      color: CATEGORY_COLORS[0]!,
      active: true,
      ...defaultValues,
    },
  });

  const icon = form.watch("icon");
  const color = form.watch("color");
  const errors = form.formState.errors;

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="flex items-center gap-3">
        <CategoryIcon icon={icon} color={color} />
        <div className="flex-1 space-y-2">
          <Label htmlFor="name">Nome da categoria</Label>
          <Input id="name" className="h-12 rounded-xl" {...form.register("name")} />
        </div>
      </div>
      {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}

      <div className="space-y-2">
        <Label>Ícone</Label>
        <div className="grid grid-cols-6 gap-2">
          {CATEGORY_ICON_KEYS.map((key) => {
            const Icon = CATEGORY_ICONS[key]!;
            return (
              <button
                key={key}
                type="button"
                aria-label={`Ícone ${key}`}
                onClick={() => form.setValue("icon", key)}
                className={cn(
                  "flex h-11 items-center justify-center rounded-xl border",
                  icon === key ? "border-primary bg-secondary" : "border-border bg-card",
                )}
              >
                <Icon className="size-5" style={{ color }} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((option) => (
            <button
              key={option}
              type="button"
              aria-label={`Cor ${option}`}
              onClick={() => form.setValue("color", option)}
              className={cn(
                "size-9 rounded-full border-2",
                color === option ? "border-foreground" : "border-transparent",
              )}
              style={{ backgroundColor: option }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <Label htmlFor="active">Categoria ativa</Label>
        <Switch
          id="active"
          checked={form.watch("active")}
          onCheckedChange={(checked) => form.setValue("active", checked)}
        />
      </div>

      <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base">
        {submitLabel}
      </Button>
    </form>
  );
}
