import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PAYMENT_METHODS.map((method) => (
        <button
          key={method.value}
          type="button"
          onClick={() => onChange(method.value)}
          className={cn(
            "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
            value === method.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          {method.label}
        </button>
      ))}
    </div>
  );
}
