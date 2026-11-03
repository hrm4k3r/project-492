-- Revisão de segurança: remove brechas que o app não usa mais.
-- Rode uma vez: Supabase > SQL Editor > New query > colar > Run. Pode rodar de novo sem problema.

-- 1) Pagamentos agora são gravados só pelo servidor (service_role).
--    Esta função deixava o cliente escrever em payment_details do próprio pedido.
drop function if exists salvar_dados_pagamento(uuid, text, jsonb);

-- 2) O perfil é criado pelo gatilho handle_new_user ao cadastrar. Sem esta policy
--    o cliente não consegue inserir um perfil por conta própria (ex.: com role = 'admin').
drop policy if exists "Usuário cria o próprio perfil" on profiles;
revoke insert on profiles from anon, authenticated;

-- 3) Bucket de fotos: aceita só imagens de até 5 MB.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
 where id = 'produtos';
