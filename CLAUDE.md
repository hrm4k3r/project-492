# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (port 3300)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

There are no automated tests; verify changes manually via the dev server.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public Supabase credentials
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used in API routes and admin operations
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` / `MERCADOPAGO_ACCESS_TOKEN` — Mercado Pago (Checkout Bricks); o token é server-only
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — e-mails transacionais (chamados via `fetch`, sem o pacote `resend`)
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
  bling.js         # Bling API client / NF-e (server-only)
  email.js         # Resend e-mails via fetch (server-only)
  frete.js         # Cotação de frete compartilhada (server-only)
  documento.js     # Validação de CPF/CNPJ (client e server)
  motoboy.js       # Entrega por motoboy (padrão R$ 15 em São Lourenço; editável em Admin > Configurações)
  pedidos.js       # confirmarPagamento(): único ponto que marca pago e dispara e-mail + NF-e (server-only)
  adminAuth.js     # requisicaoDeAdmin(request): confere Bearer token + role admin (server-only)
  melhorenvio.js    # Shipping API client (server-only — never import from client components)
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
- **Orders:** CPF/CNPJ válido é obrigatório e gravado no perfil pelo servidor (o cliente não tem UPDATE em `profiles.documento` nem em `role`; ver `schema_profiles_seguro.sql`). todo pedido (inclusive retirada na loja) exige endereço completo, pois a NF-e precisa dos dados do destinatário. o cliente NÃO tem INSERT em `orders`/`order_items` (RLS). `POST /api/pedidos/criar` (Bearer token) recalcula preços, cupom (`validate_coupon`) e frete no servidor e grava o pedido com a service role. Nunca confie em valores vindos do navegador.
- **Payments:** Mercado Pago Checkout Bricks — `POST /api/pagamento/criar` cobra `orders.total` do banco e grava `payment_id`; o webhook (`pagamento/webhook`) e o polling (`pagamento/verificar`) só marcam `pago` após consultar o pagamento na API do MP e conferir `external_reference` e valor. `verificar` usa o `payment_id` salvo no pedido, nunca um id enviado pelo cliente. Webhook e polling confirmam via `confirmarPagamento()` (`lib/pedidos.js`), que usa UPDATE condicional para disparar e-mail (Resend) e NF-e (Bling) uma única vez.
- **OAuth Bling/Melhor Envio:** `conectar` exige token de admin e devolve `{ url }` (o painel redireciona); o `state` fica em cookie httpOnly. Nunca volte a expor como link simples.
- **Path alias:** `@/*` resolves to `./src/*`.

### Database tables (Supabase/PostgreSQL)

`produtos`, `profiles`, `addresses`, `orders`, `order_items`, `coupons`, `freight_rules`, `integracoes`

Run `supabase/setup_completo.sql` to initialize a fresh project (em bancos existentes, rode também `supabase/schema_pedidos_seguro.sql`). Individual schema files in `supabase/` contain incremental changes.

### Styling

Tailwind CSS with a custom brand palette defined in `tailwind.config.js`:
- `brand` (#5A2A14) — header/footer brown
- `cream` (#F7E3C5) — light text on brand backgrounds
- `gold` / `secondary` (#C9A36A) — accent color
- `light` (#F8F1E4) — page background beige
