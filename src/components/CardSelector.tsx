import { Link } from "@tanstack/react-router";
import type { Card, PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CardSelectorProps {
  cards: Card[];
  value: string | null;
  method: PaymentMethod;
  onChange: (cardId: string) => void;
}

export function CardSelector({ cards, value, method, onChange }: CardSelectorProps) {
  const available = cards.filter(
    (card) =>
      card.active &&
      (card.type === "both" ||
        (method === "credit" && card.type === "credit") ||
        (method === "debit" && card.type === "debit")),
  );

  if (available.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        Nenhum cartão disponível.{" "}
        <Link to="/cartoes/novo" className="font-medium text-primary underline">
          Cadastrar cartão
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {available.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => onChange(card.id)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
            value === card.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          <span className="size-2.5 rounded-full" style={{ backgroundColor: card.color }} />
          {card.name}
        </button>
      ))}
    </div>
  );
}
