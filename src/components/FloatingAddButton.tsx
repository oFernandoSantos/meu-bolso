import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function FloatingAddButton() {
  return (
    <Link
      to="/gastos/novo"
      aria-label="Registrar novo gasto"
      className="fixed bottom-20 left-1/2 z-50 ml-[7.5rem] flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform active:scale-95"
    >
      <Plus className="size-7" strokeWidth={2.6} />
    </Link>
  );
}
