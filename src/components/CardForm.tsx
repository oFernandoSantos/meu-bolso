import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cardSchema, type CardFormValues } from "@/lib/schemas";
import { CARD_TYPE_LABELS, type CardType } from "@/lib/types";
import { CATEGORY_COLORS } from "@/components/CategoryIcon";
import { cn } from "@/lib/utils";

interface CardFormProps {
  defaultValues?: Partial<CardFormValues>;
  submitLabel: string;
  onSubmit: (values: CardFormValues) => void;
}

const TYPES: CardType[] = ["credit", "debit", "both"];

export function CardForm({ defaultValues, submitLabel, onSubmit }: CardFormProps) {
  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      institution: null,
      type: "both",
      credit_limit: 0,
      closing_day: null,
      due_day: null,
      color: CATEGORY_COLORS[0]!,
      active: true,
      ...defaultValues,
    },
  });

  const type = form.watch("type");
  const hasCredit = type === "credit" || type === "both";
  const errors = form.formState.errors;

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Nome do cartão</Label>
        <Input id="name" className="h-12 rounded-xl" placeholder="Ex.: Nubank" {...form.register("name")} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="institution">Banco ou instituição (opcional)</Label>
        <Input
          id="institution"
          className="h-12 rounded-xl"
          value={form.watch("institution") ?? ""}
          onChange={(event) => form.setValue("institution", event.target.value || null)}
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo do cartão</Label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                form.setValue("type", option);
                if (option === "debit") {
                  form.setValue("credit_limit", null);
                  form.setValue("closing_day", null);
                  form.setValue("due_day", null);
                }
              }}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                type === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {CARD_TYPE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {hasCredit ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="limit">Limite</Label>
            <CurrencyInput
              id="limit"
              value={form.watch("credit_limit") ?? 0}
              onChange={(cents) => form.setValue("credit_limit", cents)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="closing">Dia de fechamento</Label>
              <Input
                id="closing"
                type="number"
                min={1}
                max={31}
                className="h-12 rounded-xl"
                value={form.watch("closing_day") ?? ""}
                onChange={(event) =>
                  form.setValue("closing_day", event.target.value ? Number(event.target.value) : null)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due">Dia de vencimento</Label>
              <Input
                id="due"
                type="number"
                min={1}
                max={31}
                className="h-12 rounded-xl"
                value={form.watch("due_day") ?? ""}
                onChange={(event) =>
                  form.setValue("due_day", event.target.value ? Number(event.target.value) : null)
                }
              />
            </div>
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Cor ${color}`}
              onClick={() => form.setValue("color", color)}
              className={cn(
                "size-9 rounded-full border-2",
                form.watch("color") === color ? "border-foreground" : "border-transparent",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <Label htmlFor="active">Cartão ativo</Label>
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
