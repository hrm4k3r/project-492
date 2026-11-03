-- Entrega por motoboy: preço fixo para uma cidade. Editável em Admin > Configurações.
-- Opcional: sem rodar, a loja usa o padrão do código (R$ 15,00 em São Lourenço).
insert into configuracoes (chave, valor) values
  ('motoboy_preco', '15'::jsonb),
  ('motoboy_cidade', '"São Lourenço"'::jsonb)
on conflict (chave) do nothing;
