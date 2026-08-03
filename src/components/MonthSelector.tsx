import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import { capitalize, currentMonthKey, monthLabel, shiftMonth } from "@/lib/dates";
import { Button } from "@/components/ui/button";

interface MonthSelectorProps {
  month: string;
  onChange: (month: string) => void;
}

export function MonthSelector({ month, onChange }: MonthSelectorProps) {
  const isCurrent = month === currentMonthKey();

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-surface px-2 py-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft className="size-5" />
      </Button>
      <div className="flex flex-1 items-center justify-center gap-2">
        <span className="text-sm font-semibold">{capitalize(monthLabel(month))}</span>
        {!isCurrent ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Voltar para o mês atual"
            onClick={() => onChange(currentMonthKey())}
          >
            <CalendarClock className="size-4" />
          </Button>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Próximo mês"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
