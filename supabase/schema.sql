-- Rode no SQL Editor do Supabase.
-- Schema novo: site_slots, site_textos, ensaios, ensaio_fotos, galeria.

-- A antiga tabela de fotos únicas foi substituída pelas tabelas abaixo.
drop table if exists photos cascade;

-- ---------- Slots únicos de imagem do site ----------
create table if not exists site_slots (
  key text primary key,
  url text not null,
  public_id text not null default '',
  updated_at timestamptz not null default now()
);

-- 6 slots do hero (3 blocos de 2 imagens) + retrato do sobre + fundo do CTA.
alter table site_slots drop constraint if exists site_slots_key_check;
alter table site_slots add constraint site_slots_key_check check (key in (
  'hero_1','hero_2','hero_1b','hero_2b','hero_1c','hero_2c','sobre_foto','cta_bg'
));

insert into site_slots (key, url) values
  ('hero_1',''),('hero_2',''),
  ('hero_1b',''),('hero_2b',''),
  ('hero_1c',''),('hero_2c',''),
  ('sobre_foto',''),('cta_bg','')
on conflict (key) do nothing;

-- ---------- Textos editáveis (bio do "sobre mim") ----------
create table if not exists site_textos (
  key text primary key,
  valor text not null default ''
);

-- ---------- Ensaios ----------
create table if not exists ensaios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null check (categoria in
    ('familia','recem-nascido','gestante','infantil','casal','ensaio-externo','evento')),
  cover_url text not null default '',
  cover_public_id text not null default '',
  na_home boolean not null default false,
  posicao int not null default 0,
  data_ensaio date,
  created_at timestamptz not null default now()
);
create index if not exists ensaios_pos on ensaios (posicao);
create index if not exists ensaios_home on ensaios (na_home, posicao);

create table if not exists ensaio_fotos (
  id uuid primary key default gen_random_uuid(),
  ensaio_id uuid not null references ensaios (id) on delete cascade,
  url text not null,
  public_id text not null default '',
  posicao int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ensaio_fotos_pos on ensaio_fotos (ensaio_id, posicao);

-- ---------- Galeria ----------
create table if not exists galeria (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  public_id text not null default '',
  posicao int not null default 0,
  na_home boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists galeria_pos on galeria (posicao);
create index if not exists galeria_home on galeria (na_home, posicao);

-- ---------- Cache do Instagram ----------
create table if not exists instagram_cache (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS: leitura publica; escrita so via service role (server actions do admin).
alter table site_slots   enable row level security;
alter table site_textos  enable row level security;
alter table ensaios      enable row level security;
alter table ensaio_fotos enable row level security;
alter table galeria      enable row level security;

drop policy if exists "leitura publica" on site_slots;
drop policy if exists "leitura publica" on site_textos;
drop policy if exists "leitura publica" on ensaios;
drop policy if exists "leitura publica" on ensaio_fotos;
drop policy if exists "leitura publica" on galeria;

create policy "leitura publica" on site_slots   for select using (true);
create policy "leitura publica" on site_textos  for select using (true);
create policy "leitura publica" on ensaios      for select using (true);
create policy "leitura publica" on ensaio_fotos for select using (true);
create policy "leitura publica" on galeria      for select using (true);

-- Privilegios de tabela. O Supabase costuma conceder isso sozinho, mas quando as
-- tabelas sao criadas fora do fluxo padrao o PostgREST responde 42501
-- ("permission denied for table ...") mesmo com a chave service_role.
grant usage on schema public to anon, authenticated, service_role;

grant select on site_slots, site_textos, ensaios, ensaio_fotos, galeria
  to anon, authenticated;

grant select, insert, update, delete on site_slots, site_textos, ensaios, ensaio_fotos, galeria
  to service_role;

grant select, insert, update, delete on instagram_cache to service_role;

-- Crie a proprietaria em Authentication > Users (email + senha).
