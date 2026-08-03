/**
 * Valores monetários são SEMPRE inteiros em centavos.
 * R$ 10,50 => 1050
 */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(cents: number): string {
  return brl.format(Math.round(cents) / 100);
}

/** Formata sem o símbolo: 125090 -> "1.250,90" */
export function formatAmount(cents: number): string {
  return (Math.round(cents) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Digitação progressiva: "1" -> 1, "125090" -> 125090 centavos */
export function digitsToCents(input: string): number {
  const digits = input.replace(/\D/g, "").slice(0, 12);
  if (!digits) return 0;
  return parseInt(digits, 10);
}

/** "1.250,90" ou "1250,90" -> 125090 */
export function parseCurrencyToCents(text: string): number {
  const clean = text.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(clean);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

/** Converte reais (número) em centavos, sem erro de float. */
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}

export function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Divide o total entre as parcelas garantindo que a soma seja exata.
 * A diferença de centavos vai para as primeiras parcelas.
 * 10000 em 3 -> [3334, 3333, 3333]
 */
export function splitInstallments(totalCents: number, count: number): number[] {
  const total = Math.round(totalCents);
  const parts = Math.max(1, Math.floor(count));
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}
