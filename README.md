# Meu Bolso

Crie um aplicativo simples e funcional de controle de gastos pessoais utilizando React Native com Expo e TypeScript.

O aplicativo será usado por apenas uma pessoa e não precisa ter login, cadastro de usuário, conexão com bancos ou servidor externo.

O objetivo principal é permitir que o usuário registre rapidamente tudo o que gastar no dia a dia e acompanhe quanto gastou durante o mês.

Tecnologias

Utilize:

React Native.

Expo.

TypeScript.

Expo Router.

SQLite com expo-sqlite.

Zustand para estado global simples.

React Hook Form.

Zod para validação.

date-fns para datas.

Ícones compatíveis com Expo.

Não utilize Firebase, Supabase ou APIs externas.

Todos os dados devem ser armazenados localmente no celular com SQLite.

Interface

A interface deve ser:

Simples.

Limpa.

Moderna.

Fácil de entender.

Rápida para cadastrar um gasto.

Pensada principalmente para celular.

Em português do Brasil.

Com suporte a tema claro e escuro.

Não crie uma interface cheia de gráficos, configurações ou informações desnecessárias.

Priorize facilidade de uso.

Navegação principal

Crie apenas quatro abas:

Início.

Gastos.

Cartões.

Categorias.

Adicione um botão flutuante de destaque com o símbolo + para registrar um novo gasto rapidamente.

Tela inicial

A tela inicial deve mostrar o resumo do mês selecionado.

No topo, coloque:

Mês e ano atual.

Botão para mês anterior.

Botão para próximo mês.

Botão para retornar ao mês atual.

Exiba cards simples com:

Total gasto no mês.

Total gasto no crédito.

Total gasto no débito.

Total gasto em Pix.

Total gasto em dinheiro.

Exemplo:

Total gasto em julho
R$ 1.850,00

Crédito: R$ 1.000,00
Débito: R$ 450,00
Pix: R$ 300,00
Dinheiro: R$ 100,00


Abaixo, mostre:

Gastos por categoria.

Gastos por cartão.

Últimos cinco gastos registrados.

Não é obrigatório utilizar gráficos. Caso utilize, adicione apenas um gráfico simples de gastos por categoria.

Cadastro rápido de gasto

Essa deve ser a principal funcionalidade do aplicativo.

Ao tocar no botão +, abra uma tela ou modal simples com os seguintes campos:

Descrição.

Valor.

Data.

Forma de pagamento.

Cartão, quando necessário.

Categoria.

Quantidade de parcelas, somente para crédito.

Observação opcional.

Formas de pagamento

Disponibilize:

Cartão de crédito.

Cartão de débito.

Pix.

Dinheiro.

Outro.

Quando o usuário selecionar cartão de crédito ou débito, mostre o campo para escolher o cartão.

Quando selecionar Pix, dinheiro ou outro, o campo cartão não deve aparecer.

Quando selecionar cartão de crédito, mostre o campo de parcelas.

Quando selecionar débito, Pix, dinheiro ou outro, a quantidade de parcelas deve permanecer em 1.

Exemplo de cadastro

Descrição: Mercado
Valor: R$ 235,90
Data: 26/07/2026
Pagamento: Cartão de débito
Cartão: Nubank
Categoria: Mercado


Outro exemplo:

Descrição: Notebook
Valor: R$ 2.400,00
Pagamento: Cartão de crédito
Cartão: Nubank
Parcelas: 12
Categoria: Compras


Entrada de valor

Crie um componente de valor monetário no formato brasileiro.

Exemplo:

1 → R$ 0,01
10 → R$ 0,10
100 → R$ 1,00
125090 → R$ 1.250,90


Internamente, armazene os valores em centavos.

Exemplo:

R$ 10,50 = 1050


Nunca armazene dinheiro utilizando números com casas decimais ou float.

Gastos parcelados

Quando uma compra no crédito tiver mais de uma parcela:

Divida o valor total entre as parcelas.

Crie uma parcela para cada mês.

Mostre o número da parcela.

Garanta que a soma das parcelas seja igual ao valor total.

Trate corretamente diferenças de centavos.

Exemplo:

Compra: R$ 100,00
Parcelas: 3

1/3: R$ 33,34
2/3: R$ 33,33
3/3: R$ 33,33


Na lista de gastos, mostre:

Notebook
Compras · Nubank
R$ 200,00
Parcela 2 de 12


Tela de gastos

A tela de gastos deve mostrar todos os gastos do mês selecionado.

Cada item deve apresentar:

Descrição.

Valor.

Data.

Categoria.

Forma de pagamento.

Cartão, quando existir.

Número da parcela, quando existir.

Exemplo:

Mercado
Mercado · Débito · Nubank
26/07/2026
R$ 235,90


Adicione filtros simples por:

Mês.

Categoria.

Forma de pagamento.

Cartão.

Texto da descrição.

Permita ordenar por:

Mais recente.

Mais antigo.

Maior valor.

Menor valor.

Ao tocar em um gasto, permita:

Visualizar detalhes.

Editar.

Excluir.

Tela de cartões

Permita cadastrar cartões de crédito e débito.

Campos:

Nome do cartão.

Banco ou instituição opcional.

Tipo do cartão.

Limite, somente para crédito.

Dia de fechamento, somente para crédito.

Dia de vencimento, somente para crédito.

Cor.

Ativo ou inativo.

Tipos:

Crédito.

Débito.

Crédito e débito.

Exemplo:

Nubank
Crédito e débito
Limite: R$ 3.000,00


Para cartões de crédito, mostre:

Limite total.

Gasto do mês.

Limite disponível.

Percentual utilizado.

Para cartões de débito, mostre apenas o total gasto no mês.

Não precisa controlar o saldo da conta bancária.

Categorias

Crie inicialmente estas categorias:

Alimentação.

Mercado.

Transporte.

Moradia.

Saúde.

Educação.

Lazer.

Compras.

Assinaturas.

Viagem.

Presentes.

Outros.

Permita:

Criar categoria.

Editar categoria.

Escolher ícone.

Escolher cor.

Desativar categoria.

Banco de dados

Crie as tabelas:

cards.

categories.

expenses.

installments.

settings.

Tabela cards

Campos:

id
name
institution
type
credit_limit
closing_day
due_day
color
active
created_at
updated_at


O campo type pode ter:

credit
debit
both


Tabela categories

Campos:

id
name
icon
color
active
created_at
updated_at


Tabela expenses

Campos:

id
description
total_amount
expense_date
payment_method
card_id
category_id
installment_count
notes
created_at
updated_at


O campo payment_method pode ter:

credit
debit
pix
cash
other


Tabela installments

Campos:

id
expense_id
installment_number
installment_count
amount
competence_month
created_at
updated_at


O campo competence_month deve ser salvo no formato:

YYYY-MM


Ative foreign keys no SQLite.

Regras importantes

Implemente estas regras:

Todo gasto deve possuir descrição, valor, data, forma de pagamento e categoria.

Gastos no crédito podem ter parcelas.

Débito, Pix, dinheiro e outro não podem ter parcelas.

O campo cartão é obrigatório somente para crédito e débito.

Cartão de débito não precisa ter limite.

Pix e dinheiro não precisam de cartão.

Cada parcela deve aparecer no mês correspondente.

Excluir uma compra parcelada deve permitir excluir todas as parcelas.

Editar um gasto deve atualizar os totais do mês.

O usuário deve conseguir navegar entre os meses.

Os totais devem ser recalculados automaticamente.

Os dados devem continuar salvos após fechar o aplicativo.

Componentes reutilizáveis

Crie componentes simples como:

MonthSelector.

SummaryCard.

ExpenseItem.

CardItem.

CategoryItem.

CurrencyInput.

DateInput.

PaymentMethodSelector.

CardSelector.

CategorySelector.

EmptyState.

ConfirmDialog.

FloatingAddButton.

Estrutura sugerida

app/
  _layout.tsx
  index.tsx
  gastos/
    index.tsx
    novo.tsx
    [id].tsx
  cartoes/
    index.tsx
    novo.tsx
    [id].tsx
  categorias/
    index.tsx
    nova.tsx
    [id].tsx

src/
  components/
  database/
  services/
  stores/
  schemas/
  types/
  utils/
  theme/


Mantenha SQL e regras de negócio fora das telas.

Crie serviços separados para:

Cartões.

Categorias.

Gastos.

Parcelas.

Resumo mensal.

Experiência de uso

O cadastro de um gasto deve ser rápido.

O usuário deve conseguir:

Abrir o aplicativo.

Tocar no botão +.

Digitar descrição e valor.

Escolher a forma de pagamento.

Escolher o cartão, quando necessário.

Escolher a categoria.

Salvar.

Ao salvar, mostre:

Gasto cadastrado com sucesso.


Após salvar, retorne para a tela anterior e atualize os totais automaticamente.

Tela vazia

Quando ainda não houver gastos, mostre:

Nenhum gasto registrado neste mês.

Toque no botão + para adicionar seu primeiro gasto.


Quando não houver cartões:

Nenhum cartão cadastrado.

Cadastre um cartão para registrar gastos no crédito ou débito.


Configurações simples

Inclua apenas:

Tema claro.

Tema escuro.

Seguir tema do sistema.

Exportar backup em JSON.

Importar backup em JSON.

Apagar todos os dados.

Não adicione configurações desnecessárias.

Testes

Crie testes para:

Formatação de moeda.

Conversão de reais para centavos.

Divisão de parcelas.

Diferença de centavos.

Total mensal.

Total por forma de pagamento.

Total por cartão.

Total por categoria.

Mudança entre meses.

README

Crie um README.md com:

Objetivo do aplicativo.

Funcionalidades.

Tecnologias.

Instalação.

Execução.

Estrutura do projeto.

Banco de dados.

Como executar os testes.

Inclua:

npm install
npx expo start
npm test


Entrega

Crie o projeto completo e funcional.

Não entregue apenas um planejamento ou exemplos isolados.

Ao finalizar:

Execute a verificação do TypeScript.

Execute o ESLint.

Execute os testes.

Corrija os erros encontrados.

Verifique todas as rotas.

Verifique o banco SQLite.

Verifique o cadastro de crédito, débito, Pix e dinheiro.

Verifique compras parceladas.

Verifique edição e exclusão.

Verifique os totais mensais.

Comece implementando o projeto agora.

Priorize uma primeira versão simples, funcional e fácil de usar. Não adicione recursos avançados que não sejam necessários para registrar e acompanhar gastos pessoais.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/880070db-dc3b-4a63-9e28-20fc8fae054e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
