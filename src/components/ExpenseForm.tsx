import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { CurrencyInput } from "@/components/CurrencyInput";
import { DateInput } from "@/components/DateInput";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { CardSelector } from "@/components/CardSelector";
import { CategorySelector } from "@/components/CategorySelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { expenseSchema, type ExpenseFormValues } from "@/lib/schemas";
import { splitInstallments, formatCurrency } from "@/lib/money";
import { allowsInstallments, requiresCard } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { todayISO } from "@/lib/dates";

interface ExpenseFormProps {
  defaultValues?: Partial<ExpenseFormValues>;
  submitLabel: string;
  onSubmit: (values: ExpenseFormValues) => void;
}

export function ExpenseForm({ defaultValues, submitLabel, onSubmit }: ExpenseFormProps) {
  const cards = useAppStore((state) => state.cards);
  const categories = useAppStore((state) => state.categories);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      total_amount: 0,
      expense_date: todayISO(),
      payment_method: "pix",
      card_id: null,
      category_id: "",
      installment_count: 1,
      notes: null,
      ...defaultValues,
    },
  });

  const method = form.watch("payment_method");
  const amount = form.watch("total_amount");
  const installmentCount = form.watch("installment_count");
  const errors = form.formState.errors;

  const parts = splitInstallments(amount, installmentCount);

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="amount">Valor</Label>
        <CurrencyInput
          id="amount"
          autoFocus
          value={amount}
          onChange={(cents) => form.setValue("total_amount", cents, { shouldValidate: true })}
        />
        {errors.total_amount ? (
          <p className="text-xs text-destructive">{errors.total_amount.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          placeholder="Ex.: Mercado"
          className="h-12 rounded-xl"
          {...form.register("description")}
        />
        {errors.description ? (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Data</Label>
        <DateInput
          id="date"
          value={form.watch("expense_date")}
          onChange={(value) => form.setValue("expense_date", value, { shouldValidate: true })}
        />
        {errors.expense_date ? (
          <p className="text-xs text-destructive">{errors.expense_date.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Forma de pagamento</Label>
        <PaymentMethodSelector
          value={method}
          onChange={(value) => {
            form.setValue("payment_method", value, { shouldValidate: true });
            if (!requiresCard(value)) form.setValue("card_id", null);
            if (!allowsInstallments(value)) form.setValue("installment_count", 1);
          }}
        />
      </div>

      {requiresCard(method) ? (
        <div className="space-y-2">
          <Label>Cartão</Label>
          <CardSelector
            cards={cards}
            method={method}
            value={form.watch("card_id")}
            onChange={(cardId) => form.setValue("card_id", cardId, { shouldValidate: true })}
          />
          {errors.card_id ? (
            <p className="text-xs text-destructive">{errors.card_id.message}</p>
          ) : null}
        </div>
      ) : null}

      {allowsInstallments(method) ? (
        <div className="space-y-2">
          <Label htmlFor="installments">Parcelas</Label>
          <div className="flex items-center gap-3">
            <Input
              id="installments"
              type="number"
              min={1}
              max={48}
              className="h-12 w-24 rounded-xl"
              value={installmentCount}
              onChange={(event) =>
                form.setValue(
                  "installment_count",
                  Math.min(48, Math.max(1, Number(event.target.value) || 1)),
                  { shouldValidate: true },
                )
              }
            />
            {installmentCount > 1 && amount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {installmentCount}x de {formatCurrency(parts[1] ?? parts[0] ?? 0)}
                {parts[0] !== parts[parts.length - 1]
                  ? ` (1ª de ${formatCurrency(parts[0] ?? 0)})`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Categoria</Label>
        {categories.filter((category) => category.active).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            Nenhuma categoria ativa.{" "}
            <Link to="/categorias/nova" className="font-medium text-primary underline">
              Criar categoria
            </Link>
          </p>
        ) : (
          <CategorySelector
            categories={categories}
            value={form.watch("category_id")}
            onChange={(categoryId) =>
              form.setValue("category_id", categoryId, { shouldValidate: true })
            }
          />
        )}
        {errors.category_id ? (
          <p className="text-xs text-destructive">{errors.category_id.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observação (opcional)</Label>
        <Textarea
          id="notes"
          rows={2}
          className="rounded-xl"
          value={form.watch("notes") ?? ""}
          onChange={(event) => form.setValue("notes", event.target.value || null)}
        />
      </div>

      <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base">
        {submitLabel}
      </Button>
    </form>
  );
}
