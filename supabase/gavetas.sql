-- Rode no SQL Editor do Supabase (depois de supabase/biblioteca.sql).
-- Gaveta e um agrupamento livre: apenas um texto na propria linha da foto.
-- Nenhuma tabela nova; NULL significa "fora de qualquer gaveta".

alter table biblioteca add column if not exists colecao text;
create index if not exists biblioteca_colecao on biblioteca (colecao);
