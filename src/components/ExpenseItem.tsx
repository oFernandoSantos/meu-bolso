import { Link } from "@tanstack/react-router";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatDateBR } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { PAYMENT_LABELS, type EntryView } from "@/lib/types";

interface ExpenseItemProps {
  entry: EntryView;
  showDate?: boolean;
}

export function ExpenseItem({ entry, showDate = true }: ExpenseItemProps) {
  const { expense, installment, card, category } = entry;
  const details = [category?.name, PAYMENT_LABELS[expense.payment_method], card?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      to="/gastos/$id"
      params={{ id: expense.id }}
      className="card-soft flex items-center gap-3 px-3.5 py-3 transition-colors active:bg-muted"
    >
      <CategoryIcon icon={category?.icon ?? "circle-dashed"} color={category?.color ?? "#64748b"} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{expense.description}</p>
        <p className="truncate text-xs text-muted-foreground">{details}</p>
        {showDate ? (
          <p className="text-xs text-muted-foreground">{formatDateBR(expense.expense_date)}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="num text-sm font-bold">{formatCurrency(installment.amount)}</p>
        {installment.installment_count > 1 ? (
          <p className="text-[0.7rem] text-muted-foreground">
            Parcela {installment.installment_number} de {installment.installment_count}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
