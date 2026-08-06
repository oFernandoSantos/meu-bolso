import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function FloatingAddButton() {
  return (
    <Link
      to="/gastos/novo"
      aria-label="Registrar novo gasto"
      className="fixed bottom-20 left-1/2 z-50 ml-[7.5rem] flex size-14 items-center justify-center rounded-full border border-violet-500 bg-black text-violet-400 transition-transform active:scale-95"
      style={{
        boxShadow:
          "0 0 0 1px rgba(139, 92, 246, 0.22), 0 0 18px rgba(139, 92, 246, 0.7), 0 0 34px rgba(139, 92, 246, 0.4), 0 12px 28px rgba(20, 12, 40, 0.42)",
      }}
    >
      <Plus className="size-7" strokeWidth={2.6} />
    </Link>
  );
}
