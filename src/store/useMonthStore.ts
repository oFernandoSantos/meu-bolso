import { create } from "zustand";
import { currentMonthKey } from "@/lib/dates";

interface MonthState {
  month: string;
  setMonth: (month: string) => void;
}

export const useMonthStore = create<MonthState>()((set) => ({
  month: currentMonthKey(),
  setMonth: (month) => set({ month }),
}));
