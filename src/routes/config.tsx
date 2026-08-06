import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/config")({
  head: () => ({
    meta: [
      { title: "Configurações — Meus Gastos" },
      { name: "description", content: "Exporte gastos por mês em JSON e apague dados locais." },
      { property: "og:title", content: "Configurações — Meus Gastos" },
      { property: "og:description", content: "Exportação mensal de gastos e limpeza de dados." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const clearAll = useAppStore((state) => state.clearAll);
  const store = useAppStore();

  const exportBackup = () => {
    const entriesByMonth = store.installments.reduce<
      Record<string, Array<Record<string, unknown>>>
    >((acc, installment) => {
      const expense = store.expenses.find((item) => item.id === installment.expense_id);
      if (!expense) return acc;

      const month = installment.competence_month;
      const category = store.categories.find((item) => item.id === expense.category_id);
      const card = store.cards.find((item) => item.id === expense.card_id);

      if (!acc[month]) acc[month] = [];
      acc[month]!.push({
        date: expense.expense_date,
        description: expense.description,
        amount: installment.amount,
        total_amount: expense.total_amount,
        payment_method: expense.payment_method,
        category: category?.name ?? null,
        card: card?.name ?? null,
        installment:
          expense.installment_count > 1
            ? `${installment.installment_number}/${installment.installment_count}`
            : null,
        notes: expense.notes,
      });

      return acc;
    }, {});

    const data = {
      exported_at: new Date().toISOString(),
      months: Object.fromEntries(
        Object.entries(entriesByMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, entries]) => [
            month,
            entries.sort((a, b) => String(a.date).localeCompare(String(b.date))),
          ]),
      ),
    };

    const reportHtml = `
      <html>
        <head>
          <title>Relatorio de gastos por mes</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            .meta { margin-bottom: 24px; color: #555; font-size: 12px; }
            .month { margin: 24px 0 12px; page-break-inside: avoid; }
            .month h2 { margin: 0 0 12px; font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f5f5f5; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Relatorio de gastos por mes</h1>
          <div class="meta">Gerado em ${new Date(data.exported_at).toLocaleString("pt-BR")}</div>
          ${Object.entries(data.months)
            .map(
              ([month, entries]) => `
                <section class="month">
                  <h2>${month}</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Descricao</th>
                        <th>Valor</th>
                        <th>Pagamento</th>
                        <th>Categoria</th>
                        <th>Cartao</th>
                        <th>Parcela</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(entries as Array<Record<string, unknown>>)
                        .map(
                          (entry) => `
                            <tr>
                              <td>${String(entry.date ?? "")}</td>
                              <td>${String(entry.description ?? "")}</td>
                              <td>${Number(entry.amount ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                              <td>${String(entry.payment_method ?? "")}</td>
                              <td>${String(entry.category ?? "-")}</td>
                              <td>${String(entry.card ?? "-")}</td>
                              <td>${String(entry.installment ?? "-")}</td>
                            </tr>
                          `,
                        )
                        .join("")}
                    </tbody>
                  </table>
                </section>
              `,
            )
            .join("")}
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) {
      toast.error("Permita pop-up para exportar em PDF");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    toast.success("Relatorio pronto para salvar em PDF");
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
          className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
      }
    >
      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Backup</h2>
          <Button variant="outline" className="h-12 w-full rounded-xl" onClick={exportBackup}>
            <Download className="size-4" /> Exportar gastos em PDF
          </Button>
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
              <Button variant="outline" className="h-12 w-full rounded-xl text-[#b00020]">
                <Trash2 className="size-4 text-[#b00020]" /> Apagar todos os dados
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
