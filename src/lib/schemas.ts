import { z } from "zod";

export const expenseSchema = z
  .object({
    description: z.string().trim().min(1, "Informe a descrição"),
    total_amount: z.number().int().positive("Informe um valor maior que zero"),
    expense_date: z.string().min(1, "Informe a data"),
    payment_method: z.enum(["credit", "debit", "pix", "cash", "other"]),
    card_id: z.string().nullable(),
    category_id: z.string().min(1, "Escolha uma categoria"),
    installment_count: z.number().int().min(1).max(48),
    notes: z.string().nullable(),
  })
  .refine(
    (data) =>
      data.payment_method === "credit" || data.payment_method === "debit"
        ? Boolean(data.card_id)
        : true,
    { message: "Escolha um cartão", path: ["card_id"] },
  )
  .refine((data) => (data.payment_method === "credit" ? true : data.installment_count === 1), {
    message: "Somente crédito pode ser parcelado",
    path: ["installment_count"],
  });

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const cardSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome do cartão"),
    institution: z.string().nullable(),
    type: z.enum(["credit", "debit", "both"]),
    credit_limit: z.number().int().min(0).nullable(),
    closing_day: z.number().int().min(1).max(31).nullable(),
    due_day: z.number().int().min(1).max(31).nullable(),
    color: z.string().min(1),
    active: z.boolean(),
  })
  .refine((data) => (data.type === "debit" ? true : true));

export type CardFormValues = z.infer<typeof cardSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria"),
  icon: z.string().min(1),
  color: z.string().min(1),
  active: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
