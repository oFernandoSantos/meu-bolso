import { describe, expect, it } from "vitest";
import { formatDateBR, monthKey, monthKeyToDate, shiftDateISO, shiftMonth } from "./dates";

describe("datas", () => {
  it("calcula o mes corretamente", () => {
    expect(monthKey("2026-08-13")).toBe("2026-08");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("converte chave de mes valida em data do primeiro dia", () => {
    const result = monthKeyToDate("2026-08");
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(1);
  });

  it("formata e desloca datas ISO", () => {
    expect(formatDateBR("2026-08-13")).toBe("13/08/2026");
    expect(shiftDateISO("2026-08-13", "week", 1)).toBe("2026-08-20");
    expect(shiftDateISO("2026-08-13", "month", 1)).toBe("2026-09-13");
    expect(shiftDateISO("2026-08-13", "year", 1)).toBe("2027-08-13");
  });
});
