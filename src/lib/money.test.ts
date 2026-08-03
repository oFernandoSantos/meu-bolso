import { describe, expect, it } from "vitest";
import {
  digitsToCents,
  formatAmount,
  formatCurrency,
  parseCurrencyToCents,
  reaisToCents,
  splitInstallments,
} from "./money";

describe("formatação de moeda", () => {
  it("formata centavos em reais", () => {
    expect(formatCurrency(185000).replace(/\u00a0/g, " ")).toBe("R$ 1.850,00");
    expect(formatCurrency(1050).replace(/\u00a0/g, " ")).toBe("R$ 10,50");
    expect(formatCurrency(0).replace(/\u00a0/g, " ")).toBe("R$ 0,00");
  });

  it("formata sem símbolo", () => {
    expect(formatAmount(125090)).toBe("1.250,90");
  });
});

describe("conversão de reais para centavos", () => {
  it("converte digitação progressiva", () => {
    expect(digitsToCents("1")).toBe(1);
    expect(digitsToCents("10")).toBe(10);
    expect(digitsToCents("100")).toBe(100);
    expect(digitsToCents("125090")).toBe(125090);
    expect(digitsToCents("")).toBe(0);
  });

  it("converte texto formatado", () => {
    expect(parseCurrencyToCents("1.250,90")).toBe(125090);
    expect(parseCurrencyToCents("R$ 235,90")).toBe(23590);
  });

  it("converte número em reais sem erro de float", () => {
    expect(reaisToCents(10.5)).toBe(1050);
    expect(reaisToCents(0.29)).toBe(29);
    expect(reaisToCents(1.005)).toBe(101);
  });
});

describe("divisão de parcelas", () => {
  it("divide igualmente quando possível", () => {
    expect(splitInstallments(24000, 12)).toEqual(Array.from({ length: 12 }, () => 2000));
  });

  it("trata diferença de centavos", () => {
    expect(splitInstallments(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitInstallments(10, 4)).toEqual([3, 3, 2, 2]);
  });

  it("mantém a soma igual ao total", () => {
    for (const total of [100, 999, 23590, 240000, 1]) {
      for (const count of [1, 2, 3, 7, 12, 48]) {
        const parts = splitInstallments(total, count);
        expect(parts).toHaveLength(count);
        expect(parts.reduce((sum, part) => sum + part, 0)).toBe(total);
      }
    }
  });
});
