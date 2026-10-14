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
- `INFINITEPAY_HANDLE` — InfiniteTag sem o `$` (ex: `curadoria`)
- `NEXT_PUBLIC_SITE_URL` — URL pública da loja, usada para montar `redirect_url` e `webhook_url`
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
  api/              # API routes: frete/calcular, melhorenvio (OAuth), pagamento/criar, pagamento/webhook
  pagamento/retorno # Post-payment confirmation page (polls order status after InfinitePay redirect)
  styles/           # Global CSS
src/lib/
  loja.js           # Store constants: LOJA, CATEGORIAS, formatBRL
  infinitepay.js    # InfinitePay API client (server-only — never import from client components)
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
- **Shipping:** Two modes — Melhor Envio API (dynamic rates via OAuth token stored in `integracoes` table) and static `freight_rules` table as fallback.
- **Payments:** InfinitePay hosted checkout — `POST /api/pagamento/criar` cria o link, o cliente é redirecionado para a InfinitePay (escolhe Pix ou cartão), e o webhook em `POST /api/pagamento/webhook` confirma o pagamento. O webhook é não-assinado: toda confirmação é validada via `payment_check` antes de atualizar o banco. Auth: `INFINITEPAY_HANDLE`.
- **Path alias:** `@/*` resolves to `./src/*`.

### Database tables (Supabase/PostgreSQL)

`produtos`, `profiles`, `addresses`, `orders`, `order_items`, `coupons`, `freight_rules`, `integracoes`

Run `supabase/setup_completo.sql` to initialize a fresh project. Individual schema files in `supabase/` contain incremental changes.

### Styling

Tailwind CSS with a custom brand palette defined in `tailwind.config.js`:
- `brand` (#5A2A14) — header/footer brown
- `cream` (#F7E3C5) — light text on brand backgrounds
- `gold` / `secondary` (#C9A36A) — accent color
- `light` (#F8F1E4) — page background beige
