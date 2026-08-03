import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { ArrowLeft, Download, Monitor, Moon, Sun, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import type { Database, ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/config")({
  head: () => ({
    meta: [
      { title: "Configurações — Meus Gastos" },
      { name: "description", content: "Tema claro ou escuro, backup em JSON e apagar dados." },
      { property: "og:title", content: "Configurações — Meus Gastos" },
      { property: "og:description", content: "Tema, backup e limpeza de dados do aplicativo." },
    ],
  }),
  component: SettingsPage,
});

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function SettingsPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const theme = useAppStore((state) => state.settings.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const replaceAll = useAppStore((state) => state.replaceAll);
  const clearAll = useAppStore((state) => state.clearAll);
  const store = useAppStore();

  const exportBackup = () => {
    const data: Database = {
      cards: store.cards,
      categories: store.categories,
      expenses: store.expenses,
      installments: store.installments,
      settings: store.settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup-gastos-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado");
  };

  const importBackup = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<Database>;
      if (!Array.isArray(parsed.expenses) || !Array.isArray(parsed.categories)) {
        throw new Error("formato inválido");
      }
      replaceAll({
        cards: parsed.cards ?? [],
        categories: parsed.categories,
        expenses: parsed.expenses,
        installments: parsed.installments ?? [],
        settings: { theme: parsed.settings?.theme ?? "system" },
      });
      toast.success("Backup importado com sucesso");
    } catch {
      toast.error("Arquivo de backup inválido");
    }
  };

  return (
    <AppShell
      title="Configurações"
      withTabs={false}
      action={
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => navigate({ to: "/" })}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </button>
      }
    >
      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Tema</h2>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                    theme === option.value
                      ? "border-primary bg-secondary text-secondary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Backup</h2>
          <Button variant="outline" className="h-12 w-full rounded-xl" onClick={exportBackup}>
            <Download className="size-4" /> Exportar backup em JSON
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" /> Importar backup em JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importBackup(file);
              event.target.value = "";
            }}
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Dados</h2>
          <ConfirmDialog
            title="Apagar todos os dados?"
            description="Gastos, cartões e categorias personalizadas serão removidos deste aparelho."
            confirmLabel="Apagar tudo"
            onConfirm={() => {
              clearAll();
              toast.success("Dados apagados");
              navigate({ to: "/" });
            }}
            trigger={
              <Button variant="outline" className="h-12 w-full rounded-xl text-destructive">
                <Trash2 className="size-4" /> Apagar todos os dados
              </Button>
            }
          />
          <p className="text-center text-xs text-muted-foreground">
            Os dados ficam salvos apenas neste aparelho.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
