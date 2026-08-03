import { useEffect, useState } from "react";
import { digitsToCents, formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number;
  onChange: (cents: number) => void;
  autoFocus?: boolean;
  id?: string;
  className?: string;
}

/**
 * Entrada monetária brasileira: cada dígito entra pelos centavos.
 * 1 -> R$ 0,01 | 125090 -> R$ 1.250,90
 */
export function CurrencyInput({ value, onChange, autoFocus, id, className }: CurrencyInputProps) {
  const [digits, setDigits] = useState(value ? String(value) : "");

  useEffect(() => {
    setDigits(value ? String(value) : "");
  }, [value]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-input bg-card px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30",
        className,
      )}
    >
      <span className="num text-lg font-semibold text-muted-foreground">R$</span>
      <input
        id={id}
        autoFocus={autoFocus}
        inputMode="numeric"
        aria-label="Valor"
        className="num w-full bg-transparent text-right text-2xl font-bold outline-none"
        value={formatAmount(digitsToCents(digits))}
        onChange={(event) => {
          const nextDigits = event.target.value.replace(/\D/g, "").slice(0, 12);
          setDigits(nextDigits);
          onChange(digitsToCents(nextDigits));
        }}
      />
    </div>
  );
}
