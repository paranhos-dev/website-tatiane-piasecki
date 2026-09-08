-- Rode no SQL Editor do Supabase.
-- Acervo central de fotos: a Tatiane sobe tudo aqui e depois atribui as secoes.

create table if not exists biblioteca (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  public_id text not null,
  categoria text check (categoria in
    ('familia','recem-nascido','gestante','infantil','casal','ensaio-externo','evento','outro')),
  notas text not null default '',
  posicao int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists biblioteca_cat on biblioteca (categoria);
create index if not exists biblioteca_pos on biblioteca (posicao);

alter table biblioteca enable row level security;
drop policy if exists "leitura publica" on biblioteca;
create policy "leitura publica" on biblioteca for select using (true);
grant select on biblioteca to anon, authenticated;
grant select, insert, update, delete on biblioteca to service_role;
