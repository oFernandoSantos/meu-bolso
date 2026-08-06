# Policies RLS

As policies RLS principais estao versionadas em:

- `banco/migrations/005_rls.sql`

Objetivo:

- cada usuario le apenas seus proprios dados;
- categorias de sistema podem ser lidas por todos os usuarios autenticados;
- criacao, edicao e exclusao exigem `usuario_id = usuario_atual_id()`;
- service role deve ser usada apenas pelo backend.
