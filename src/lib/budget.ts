import { monthKeyToDate, shiftMonth } from "./dates";
import { entriesForMonth, sumEntries } from "./summary";
import type { Database, MonthlyIncomeExtra, MonthlySavingsEntry } from "./types";

export interface MonthBudgetSnapshot {
  month: string;
  fixedIncome: number;
  extraIncome: number;
  carriedBalance: number;
  expenseTotal: number;
  savingsTotal: number;
  closingBalance: number;
}

function compareMonth(a: string, b: string): number {
  return monthKeyToDate(a).getTime() - monthKeyToDate(b).getTime();
}

export function recurringIncomeForMonth(
  month: string,
  monthlyIncomeByMonth: Record<string, number>,
): number {
  const months = Object.keys(monthlyIncomeByMonth).sort(compareMonth);
  let current = 0;

  for (const item of months) {
    if (compareMonth(item, month) > 0) break;
    current = monthlyIncomeByMonth[item] ?? current;
  }

  return current;
}

export function totalExtraIncome(extras: MonthlyIncomeExtra[] | undefined): number {
  return (extras ?? []).reduce((total, item) => total + item.amount, 0);
}

export function totalSavingsForMonth(entries: MonthlySavingsEntry[] | undefined): number {
  return (entries ?? [])
    .filter((entry) => entry.deduct_from_income && !entry.already_saved)
    .reduce((total, entry) => total + entry.amount, 0);
}

function firstRelevantMonth(db: Database, targetMonth: string): string {
  const months = new Set<string>([
    targetMonth,
    ...Object.keys(db.settings.monthly_income_by_month),
    ...Object.keys(db.settings.monthly_income_extras_by_month),
    ...Object.keys(db.settings.monthly_savings_by_month),
    ...db.installments.map((item) => item.competence_month),
  ]);

  return [...months].sort(compareMonth)[0] ?? targetMonth;
}

export function monthBudgetSnapshot(db: Database, targetMonth: string): MonthBudgetSnapshot {
  const startMonth = firstRelevantMonth(db, targetMonth);
  let month = startMonth;
  let carry = 0;

  while (compareMonth(month, targetMonth) <= 0) {
    const fixedIncome = recurringIncomeForMonth(month, db.settings.monthly_income_by_month);
    const extraIncome = totalExtraIncome(db.settings.monthly_income_extras_by_month[month]);
    const savingsTotal = totalSavingsForMonth(db.settings.monthly_savings_by_month[month]);
    const expenseTotal = sumEntries(
      entriesForMonth(month, db.expenses, db.installments, db.cards, db.categories),
    );
    const closingBalance = carry + fixedIncome + extraIncome - expenseTotal - savingsTotal;

    if (month === targetMonth) {
      return {
        month,
        fixedIncome,
        extraIncome,
        carriedBalance: carry,
        expenseTotal,
        savingsTotal,
        closingBalance,
      };
    }

    carry = Math.max(0, closingBalance);
    month = shiftMonth(month, 1);
  }

  return {
    month: targetMonth,
    fixedIncome: 0,
    extraIncome: 0,
    carriedBalance: 0,
    expenseTotal: 0,
    savingsTotal: 0,
    closingBalance: 0,
  };
}
