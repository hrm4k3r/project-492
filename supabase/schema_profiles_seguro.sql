-- CORREÇÃO DE SEGURANÇA: a policy "Usuário atualiza o próprio perfil" não limitava colunas,
-- então qualquer cliente logado podia rodar update profiles set role = 'admin' pelo Supabase
-- e virar administrador. Aqui o UPDATE do cliente fica restrito a colunas inofensivas.
-- O CPF/CNPJ (documento) é gravado pelo servidor (POST /api/pedidos/criar, service_role).
-- Rode no SQL Editor do Supabase.
revoke update on profiles from anon, authenticated;
grant update (full_name, phone) on profiles to authenticated;
