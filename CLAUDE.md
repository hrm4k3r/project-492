# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Build for production
npm start        # Start production server
npm test         # Testes automatizados (Vitest, tests/)
npm run lint     # Run ESLint
```

Há testes automatizados em `tests/` (Vitest): lógica pura em `tests/lib`, rotas de pedido e pagamento em `tests/api` com Supabase falso em memória (`tests/helpers/fakeSupabase.js`) e Mercado Pago/e-mail/Bling simulados. Rode `npm test` antes de publicar mudanças em pedido, pagamento ou cupom. Fluxos de tela e integrações reais (Mercado Pago, Bling, Resend) seguem sendo verificados manualmente.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public Supabase credentials
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used in API routes and admin operations
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` / `MERCADOPAGO_ACCESS_TOKEN` — Mercado Pago (Checkout Bricks); o token é server-only
- `MERCADOPAGO_WEBHOOK_SECRET` — assinatura secreta do webhook do MP (server-only); sem ela a assinatura não é verificada
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — e-mails transacionais (chamados via `fetch`, sem o pacote `resend`)
- `EMAIL_AVISO_LOJA` — opcional; e-mails (separados por vírgula) avisados quando um pedido é criado (aguardando pagamento) e de novo quando é pago. `NEXT_PUBLIC_SITE_URL` — opcional; base dos links nos e-mails (padrão `https://www.curadoriadamesa.com.br`)
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — opcionais (server-only); avisam no Telegram quando um pedido é criado e quando é pago. `TELEGRAM_CHAT_ID` aceita vários ids separados por vírgula. Sem eles o recurso fica desligado
- `BLING_CLIENT_ID` / `BLING_CLIENT_SECRET` / `BLING_REDIRECT_URI` / `BLING_ESTADO_ORIGEM` — Bling (emissão de NF-e)
- `BLING_FORMA_PGTO_PIX` / `BLING_FORMA_PGTO_CREDITO` / `BLING_FORMA_PGTO_DEBITO` — ids das formas de pagamento na conta Bling; a NF-e usa o tipo real do pagamento no Mercado Pago
- `MELHORENVIO_*` — shipping integration OAuth credentials
- `MELHORENVIO_CEP_ORIGEM` — store origin ZIP code for shipping calculation

## Architecture

**Next.js 13 App Router + Supabase** e-commerce platform for curated food/beverages (craft beers, wines, cheeses, coffees) targeting the Brazilian market.

### Source layout

```
src/app/
  components/       # Reusable UI components (Catalogo, NavBar, etc.)
  context/          # React Context: AuthContext (Supabase auth), CartContext (localStorage cart)
  admin/            # Protected admin panel (products, orders, coupons, shipping, settings)
  api/              # API routes: frete/calcular, melhorenvio e bling (OAuth), pedidos/criar, pedidos/[id]/status, pagamento/criar|verificar|webhook
  pagamento/        # Páginas de pagamento ([orderId] com Bricks e polling de status; retorno)
  styles/           # Global CSS
src/lib/
  loja.js           # Store constants: LOJA, CATEGORIAS, formatBRL
  mercadopago.js   # Mercado Pago API client (server-only — never import from client components)
  mpAssinatura.js  # Valida x-signature do webhook do Mercado Pago (server-only)
  bling.js         # Bling API client / NF-e (server-only)
  email.js         # Resend e-mails via fetch (server-only): pedido recebido, pagamento confirmado, status por modalidade (retirada/motoboy/entrega, com código de rastreio) e aviso à loja
  telegram.js      # Aviso opcional de novo pedido no Telegram via fetch (server-only); desligado sem TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID
  frete.js         # Cotação de frete compartilhada (server-only)
  documento.js     # Validação de CPF/CNPJ (client e server)
  motoboy.js       # Entrega por motoboy (padrão R$ 15 em São Lourenço; editável em Admin > Configurações)
  pedidos.js       # confirmarPagamento(): único ponto que marca pago e dispara e-mail + NF-e (server-only)
  adminAuth.js     # requisicaoDeAdmin(request): confere Bearer token + role admin (server-only)
  melhorenvio.js    # Shipping API client (server-only — never import from client components)
  rastreio.js      # Link de rastreio (só código dos Correios); usado em Minha conta e no e-mail de envio
  planilha.js       # CSV import/export for products
  useConfiguracoes.js # Hook for store configuration from Supabase
config/supabase.js  # Supabase client initialization
supabase/           # SQL schema files (run setup_completo.sql for a fresh database)
```

### Key architectural decisions

- **Cart:** localStorage only, no backend. Lives in `CartContext`.
- **Auth & roles:** Supabase Auth extended with a `profiles` table (role: `customer` | `admin`). Admin routes check role via `AuthContext`.
- **Security:** Supabase Row-Level Security (RLS) is the enforcement layer. `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — only use it in server-side API routes.
- **Shipping:** Três modalidades em `/api/pedidos/criar`: `entrega` (Melhor Envio/tabela), `motoboy` (preço fixo `motoboy_preco`, só na cidade `motoboy_cidade`, fora do frete grátis) e `retirada`. Todas exigem endereço. Two modes — Melhor Envio API (dynamic rates via OAuth token stored in `integracoes` table) and static `freight_rules` table as fallback.
- **Frete grátis por região:** `configuracoes.frete_gratis_acima` (valor geral, 0 = desligado) e `frete_gratis_regioes` (JSON `{ sudeste: 500, ... }`, regiões norte/nordeste/centro-oeste/sudeste/sul). A região do UF do endereço de entrega, se tiver valor próprio, SUBSTITUI o geral (0 = sem frete grátis nela). Cálculo único em `lib/freteGratis.js` (`limiteFreteGratis`), usado por `/api/pedidos/criar` (quem decide) e pelo carrinho (só exibe); editável em Admin > Configurações. Não exige SQL (chave nova na mesma tabela). Motoboy e retirada continuam fora do frete grátis.
- **Cupons:** `validate_coupon(code, subtotal, customer_id)` (SQL) é a única validação; cupons com `only_first_order` (BEMVINDO) só valem sem pedido pago/preparando/enviado/entregue na conta nem em outra conta com o mesmo CPF/CNPJ (por isso `/api/pedidos/criar` grava o documento ANTES de validar o cupom; rode `supabase/schema_cupom_por_documento.sql`). O servidor passa `customer_id` (a service_role não tem `auth.uid()`). Rode `supabase/schema_cupom_primeira_compra.sql` ANTES de publicar o código que o usa.
- **Estoque:** `produtos.estoque` (NULL = sem controle) e `estoque_minimo`. `/api/pedidos/criar` recusa quantidade acima do estoque; a baixa acontece só em `confirmarPagamento()` via `baixar_estoque_pedido` (SQL, service_role) em `lib/estoque.js`, que avisa por e-mail (`EMAIL_AVISO_LOJA`) **e por Telegram** (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`) os produtos que chegaram ao mínimo; `avisarEstoqueBaixo()` em `lib/estoque.js` dispara os dois canais (a venda do PDV usa o mesmo aviso). O aviso só dispara se `estoque_minimo` > 0 ou o estoque zerar: com mínimo 0, só avisa ao esgotar. Rode `supabase/schema_estoque.sql` ANTES de publicar o código que o usa.
- **PDV (venda presencial):** Admin > Vender na loja (`/admin/pdv`) e Admin > Vendas do balcão (`/admin/vendas`, relatório por período, por forma de pagamento, mais vendidos, CSV e cancelamento). `POST /api/pdv/vender` e `/api/pdv/cancelar` (só admin) chamam `registrar_venda_balcao`/`cancelar_venda_balcao` (SQL, service_role): preço lido do banco, recusa quantidade acima do estoque e baixa/devolução na mesma transação, para o produto sair do site na hora. Tabelas `vendas_balcao`/`vendas_balcao_itens` (RLS: só admin lê; ninguém grava pelo navegador). Não emite NF-e (MEI vendendo na loja a consumidor final). Rode `supabase/schema_pdv.sql` ANTES de publicar o código que o usa.
- **Relatório geral:** Admin > Relatório de vendas (`/admin/relatorio`) soma site (pedidos pago/preparando/enviado/entregue, por `orders.created_at`) e balcão (`vendas_balcao` concluídas): faturamento, ticket médio, descontos, por canal, por dia, mais vendidos e CSV. A conta fica em `lib/relatorio.js` (testada); a tela só busca (com paginação de 1000 linhas) e desenha. Pedido pendente/cancelado não conta.
- **Orders:** CPF/CNPJ válido é obrigatório e gravado no perfil pelo servidor (o cliente não tem UPDATE em `profiles.documento` nem em `role`; ver `schema_profiles_seguro.sql`). todo pedido (inclusive retirada na loja) exige endereço completo, pois a NF-e precisa dos dados do destinatário. o cliente NÃO tem INSERT em `orders`/`order_items` (RLS). `POST /api/pedidos/criar` (Bearer token) recalcula preços, cupom (`validate_coupon`) e frete no servidor e grava o pedido com a service role. Nunca confie em valores vindos do navegador.
- **Payments:** Mercado Pago Checkout Bricks — `POST /api/pagamento/criar` (exige token do dono do pedido) cobra `orders.total` do banco e grava `payment_id`; o webhook (`pagamento/webhook`) e o polling (`pagamento/verificar`) só marcam `pago` após consultar o pagamento na API do MP e conferir `external_reference` e valor. `verificar` usa o `payment_id` salvo no pedido, nunca um id enviado pelo cliente. Webhook e polling confirmam via `confirmarPagamento()` (`lib/pedidos.js`), que usa UPDATE condicional para disparar e-mail (Resend) e NF-e (Bling) uma única vez.
- **NF-e (Bling):** `emitirNFe()` (`lib/bling.js`) cria a nota (`POST /nfe`), grava `orders.nfe_id` na hora e só então envia à Sefaz (`POST /nfe/{id}/enviar`); nova tentativa reaproveita a mesma nota (nunca cria duas). Resultado em `nfe_id`/`nfe_status`/`nfe_erro`, mostrado em Admin > Pedidos com botão "Emitir NF-e / Tentar de novo" (`POST /api/bling/nfe`, só admin). Pedido sem `payment_id` (confirmado à mão) usa a forma de pagamento Pix. Rode `supabase/schema_nfe.sql` antes de publicar. Validado em homologação (06/11/2026): nota autorizada (situação 5). Chamadas de dados vão para `api.bling.com.br` (só o OAuth fica em `www`; usar `www` nos dados dá 403 da Cloudflare). Na conta Bling: natureza de operação padrão de venda, regime tributário da empresa igual ao da natureza (MEI) e ambiente da NF-e (Preferências > Notas Fiscais > Configurações de NF-e: em Produção desde o lançamento). `BLING_NATUREZA_OPERACAO` (id) é opcional. Campos do item que o Bling só aceita nestes nomes: NCM em `classificacaoFiscal` (em `produto.ncm` ele é ignorado e a nota abre com 00000000), data da parcela em `parcelas[].data` (não `dataVencimento`), código do produto em `codigo`. O desconto do cupom é distribuído nos itens para a parcela bater com o total da nota. Em produção (07/11/2026) a primeira nota real foi autorizada; pendente com o contador: CEST/CSOSN de cerveja (substituição tributária). Homologação e Produção têm numeração e configuração separadas no Bling.
- **OAuth Bling/Melhor Envio:** `conectar` exige token de admin e devolve `{ url }` (o painel redireciona); o `state` fica em cookie httpOnly. Nunca volte a expor como link simples.
- **E-mails de cadastro/senha:** o link dos templates do Supabase aponta para `/auth/confirmar?token_hash=...&type=signup|recovery`, página com botão que chama `verifyOtp`. Não volte ao `{{ .ConfirmationURL }}` padrão: verificadores de e-mail (Outlook) consomem o link e o cliente vê `otp_expired`. Há `/esqueci-senha` e `/redefinir-senha`.
- **Path alias:** `@/*` resolves to `./src/*`.

### Database tables (Supabase/PostgreSQL)

`produtos`, `categorias`, `profiles`, `addresses`, `orders`, `order_items`, `coupons`, `freight_rules`, `configuracoes`, `integracoes`

Run `supabase/setup_completo.sql` to initialize a fresh project: ele já inclui tudo (colunas fiscais, pagamento, categorias, RLS e correções de segurança). Em bancos existentes rode apenas os `schema_*.sql` incrementais que ainda faltarem. Ao criar uma mudança de banco nova, atualize o `setup_completo.sql` junto. Individual schema files in `supabase/` contain incremental changes.

### Styling
Fontes (Cormorant Garamond, Jost, Pinyon Script) ficam em `src/app/fonts` e são carregadas com `next/font/local` no `layout.jsx`: o build não baixa nada do Google Fonts (já derrubou um deploy por timeout).

Tailwind CSS with a custom brand palette defined in `tailwind.config.js`:
- `brand` (#5A2A14) — header/footer brown
- `cream` (#F7E3C5) — light text on brand backgrounds
- `gold` / `secondary` (#C9A36A) — accent color
- `light` (#F8F1E4) — page background beige
