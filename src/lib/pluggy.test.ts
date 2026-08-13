import { describe, expect, it } from "vitest";
import { emptyDatabase } from "./storage";
import { mergePluggySync, type PluggySyncPayload } from "./pluggy";

function makePayload(itemId: string, accountId: string, name: string): PluggySyncPayload {
  return {
    item: {
      id: itemId,
      status: "UPDATED",
      executionStatus: "SUCCESS",
      connector: { name: "Banco X" },
    },
    accounts: [
      {
        id: accountId,
        type: "CREDIT",
        name,
        number: "**** 1234",
      },
    ],
    transactionsByAccount: {
      [accountId]: [
        {
          id: "tx-1",
          accountId,
          amount: -123.45,
          date: "2026-08-12T10:00:00Z",
          description: "Compra teste",
          category: "Compras",
          type: "DEBIT",
        },
      ],
    },
  };
}

describe("pluggy", () => {
  it("guarda multiplas conexoes pluggy no settings", () => {
    const first = mergePluggySync(emptyDatabase(), makePayload("item-1", "acc-1", "Cartao 1")).db;
    const second = mergePluggySync(first, makePayload("item-2", "acc-2", "Cartao 2")).db;

    expect(second.settings.pluggy.items).toHaveLength(2);
    expect(second.settings.pluggy.items.map((item) => item.item_id)).toEqual(["item-1", "item-2"]);
  });

  it("nao mistura cartoes de contas diferentes", () => {
    const result = mergePluggySync(emptyDatabase(), {
      item: {
        id: "item-1",
        status: "UPDATED",
        executionStatus: "SUCCESS",
        connector: { name: "Banco X" },
      },
      accounts: [
        { id: "acc-1", type: "CREDIT", name: "Visa Gold", number: "1111" },
        { id: "acc-2", type: "CREDIT", name: "Visa Gold", number: "2222" },
      ],
      transactionsByAccount: {
        "acc-1": [],
        "acc-2": [],
      },
    }).db;

    expect(result.cards).toHaveLength(2);
    expect(new Set(result.cards.map((card) => card.name)).size).toBe(2);
  });

  it("nao duplica transacao igual vinda de itens diferentes", () => {
    const first = mergePluggySync(emptyDatabase(), makePayload("item-1", "acc-1", "Cartao 1")).db;
    const second = mergePluggySync(first, makePayload("item-2", "acc-2", "Cartao 2")).db;

    expect(second.expenses).toHaveLength(2);
  });

  it("importa parcelamento e posiciona a parcela atual no mes correto", () => {
    const result = mergePluggySync(emptyDatabase(), {
      item: {
        id: "item-1",
        status: "UPDATED",
        executionStatus: "SUCCESS",
        connector: { name: "Banco X" },
      },
      accounts: [
        {
          id: "acc-1",
          type: "CREDIT",
          name: "Cartao 1",
          number: "1234",
          creditData: { limit: 1000, closeDay: 19, dueDay: 1 },
        },
      ],
      transactionsByAccount: {
        "acc-1": [
          {
            id: "tx-1",
            accountId: "acc-1",
            amount: -100,
            date: "2026-08-12T10:00:00Z",
            description: "Compra parcelada",
            category: "Compras",
            type: "DEBIT",
            creditCardMetadata: {
              installmentNumber: 3,
              totalInstallments: 6,
            },
          },
        ],
      },
    }).db;

    expect(result.cards[0]?.closing_day).toBe(19);
    expect(result.cards[0]?.due_day).toBe(1);
    expect(result.expenses[0]?.installment_count).toBe(6);
    expect(result.expenses[0]?.total_amount).toBe(60000);

    const related = result.installments
      .filter((item) => item.expense_id === result.expenses[0]?.id)
      .sort((a, b) => a.installment_number - b.installment_number);

    expect(related).toHaveLength(6);
    expect(related[2]?.competence_month).toBe("2026-09");
  });
});
