insert into public.categorias (usuario_id, nome, icone, cor, tipo, sistema)
values
  (null, 'Alimentacao', 'utensils', '#f97316', 'despesa', true),
  (null, 'Transporte', 'car', '#0ea5e9', 'despesa', true),
  (null, 'Moradia', 'home', '#8b5cf6', 'despesa', true),
  (null, 'Saude', 'heart-pulse', '#ef4444', 'despesa', true),
  (null, 'Educacao', 'graduation-cap', '#2563eb', 'despesa', true),
  (null, 'Lazer', 'gamepad-2', '#ec4899', 'despesa', true),
  (null, 'Assinaturas', 'repeat', '#14b8a6', 'despesa', true),
  (null, 'Compras', 'shopping-bag', '#eab308', 'despesa', true),
  (null, 'Investimentos', 'chart-column', '#06b6d4', 'receita', true),
  (null, 'Salario', 'banknote', '#22c55e', 'receita', true),
  (null, 'Outros', 'circle-dashed', '#64748b', 'despesa', true)
on conflict do nothing;
