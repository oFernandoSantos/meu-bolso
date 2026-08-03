import { Link } from "@tanstack/react-router";
import { formatCurrency } from "@/lib/money";
import { CARD_TYPE_LABELS, type Card } from "@/lib/types";
import { Progress } from "@/components/ui/progress";

interface CardItemProps {
  card: Card;
  monthTotal: number;
  creditMonthTotal: number;
}

export function CardItem({ card, monthTotal, creditMonthTotal }: CardItemProps) {
  const hasCredit = card.type === "credit" || card.type === "both";
  const limit = card.credit_limit ?? 0;
  const available = Math.max(0, limit - creditMonthTotal);
  const percent = limit > 0 ? Math.min(100, Math.round((creditMonthTotal / limit) * 100)) : 0;

  return (
    <Link
      to="/cartoes/$id"
      params={{ id: card.id }}
      className="card-soft block px-4 py-4 transition-colors active:bg-muted"
    >
      <div className="flex items-center gap-3">
        <span className="size-9 rounded-xl" style={{ backgroundColor: card.color }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {card.name}
            {!card.active ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">(inativo)</span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[CARD_TYPE_LABELS[card.type], card.institution].filter(Boolean).join(" · ")}
          </p>
        </div>
        <p className="num shrink-0 text-sm font-bold">{formatCurrency(monthTotal)}</p>
      </div>

      {hasCredit && limit > 0 ? (
        <div className="mt-3 space-y-1.5">
          <Progress value={percent} className="h-1.5" />
          <div className="flex justify-between text-[0.7rem] text-muted-foreground">
            <span>Disponível {formatCurrency(available)}</span>
            <span>
              {percent}% de {formatCurrency(limit)}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[0.7rem] text-muted-foreground">Gasto do mês</p>
      )}
    </Link>
  );
}
