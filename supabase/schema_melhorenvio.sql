-- Fazenda Santo Antônio — armazenamento dos tokens do Melhor Envio
-- Rode no SQL Editor do Supabase.

create table if not exists integracoes (
  id text primary key,
  dados jsonb not null,
  updated_at timestamptz not null default now()
);

alter table integracoes enable row level security;

-- Nenhuma policy aqui de propósito: só a service_role (usada apenas
-- no servidor) consegue ler/escrever nessa tabela. Ela guarda tokens
-- de acesso a serviços externos (Melhor Envio), então não pode ser
-- exposta nem para o cliente logado como admin.
