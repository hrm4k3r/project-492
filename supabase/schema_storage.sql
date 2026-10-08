-- Fazenda Santo Antônio — bucket de imagens dos produtos
-- Rode DEPOIS do schema_ecommerce.sql, no SQL Editor do Supabase.

insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

create policy "Fotos de produtos são públicas para leitura"
  on storage.objects for select
  using (bucket_id = 'produtos');

create policy "Admin faz upload de fotos de produtos"
  on storage.objects for insert
  with check (bucket_id = 'produtos' and is_admin());

create policy "Admin atualiza fotos de produtos"
  on storage.objects for update
  using (bucket_id = 'produtos' and is_admin());

create policy "Admin remove fotos de produtos"
  on storage.objects for delete
  using (bucket_id = 'produtos' and is_admin());
