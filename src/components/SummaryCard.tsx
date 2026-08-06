import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  label: string;
  amount: number;
  icon?: ReactNode;
  highlight?: boolean;
  className?: string;
}

export function SummaryCard({ label, amount, icon, highlight, className }: SummaryCardProps) {
  if (highlight) {
    return (
      <div
        className={cn("card-soft bg-primary p-5 text-primary-foreground shadow-float", className)}
      >
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="num mt-1 text-3xl font-bold">{formatCurrency(amount)}</p>
      </div>
    );
  }

  return (
    <div className={cn("card-soft p-3.5", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <p className="text-[0.7rem] font-medium">{label}</p>
      </div>
      <p className="num mt-1 text-base font-semibold">{formatCurrency(amount)}</p>
    </div>
  );
}
