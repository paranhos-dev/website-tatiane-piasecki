# Template Fotógrafo — Next.js 14

App Router · TypeScript · Tailwind · Supabase Auth · Cloudinary · Instagram Graph API.

## Rodar

```bash
npm install
cp .env.example .env.local   # preencha as chaves (opcional para o 1º boot)
npm run dev                  # http://localhost:3000
```

Sem `.env.local`, o site roda com **imagens de exemplo** locais e o Instagram usa placeholders — nada quebra. Configure os serviços quando quiser ligar o admin de verdade.

## Estrutura

- `app/page.tsx` — site público (Server Component; lê slots, ensaios e galeria).
- `components/` — Hero (slideshow de 3 blocos, 5s), Ensaios (cards + lightbox), Galeria (carrossel horizontal), Instagram.
- `app/admin/` — painel privado. `login` público, resto protegido pelo `middleware.ts`.
- `app/admin/actions.ts` — server actions de upload/edição (Cloudinary + Supabase).
- `app/acoes-publicas.ts` — paginação pública do carrossel ("ver mais").
- `app/api/instagram/route.ts` — últimos 9 posts, cache de 1h no Supabase.
- `lib/` — clientes Supabase/Cloudinary, Instagram, acesso aos dados.
- `supabase/schema.sql` — todas as tabelas, RLS e grants.

## Schema

| Tabela | Para quê |
| --- | --- |
| `site_slots` | Imagens únicas: 6 do hero (`hero_1`/`hero_2`, `hero_1b`/`hero_2b`, `hero_1c`/`hero_2c`), `sobre_foto`, `cta_bg` |
| `site_textos` | Texto editável: `sobre_bio`. O nome do estúdio e o título do "sobre mim" são fixos (`MARCA` / `SOBRE_TITULO` em `lib/data.ts`) |
| `ensaios` | Um ensaio por linha (título, categoria, capa, data, `na_home`, `posicao`) |
| `ensaio_fotos` | Fotos internas de cada ensaio (abrem no lightbox) |
| `galeria` | Fotos do carrossel; `na_home = false` entra no "ver mais" |
| `instagram_cache` | Cache de 1h do feed |

Limites da home: **6 ensaios** e **12 fotos** na galeria (`MAX_HOME_ENSAIOS` / `MAX_HOME_GALERIA` em `lib/data.ts`).

As 7 categorias de ensaio ficam em `CATEGORIAS` (`lib/data.ts`) e no `check` da coluna `categoria` — mudar uma exige mudar a outra.

## Configurar

1. **Supabase**: crie o projeto, rode `supabase/schema.sql`, crie a usuária proprietária em Authentication → Users, copie URL + anon/publishable key + service_role/secret key.
2. **Cloudinary**: cloud name + API key/secret.
3. **Instagram**: Graph API (conta Business/Creator) — access token de longa duração + IG user id.

Preencha `.env.local` conforme `.env.example` e reinicie o `npm run dev`.

> Se o site vier vazio e o admin não listar nada, rode `supabase/schema.sql` de novo: ele é idempotente e reaplica os `grant`. Sem esses privilégios o PostgREST responde `42501 — permission denied for table ...` mesmo com a chave `service_role`, e o app trata isso como "sem dados".

## Admin

`/admin` → redireciona para `/admin/login` sem sessão. O painel é uma coluna única, na mesma ordem do site:

1. **Hero** — 3 blocos de 2 imagens (esquerda + direita); clique troca a imagem.
2. **Sobre mim** — retrato + bio (botão salvar).
3. **Ensaios** — criar (modal com título, categoria, data e capa), expandir para gerenciar as fotos internas, reordenar, alternar "na home", deletar.
4. **Galeria** — enviar várias fotos, reordenar, alternar "na home", deletar.
5. **CTA** — slot da imagem de fundo da faixa final.

Deletar remove a imagem do Cloudinary **e** a linha no banco. As mudanças aparecem no site na hora (`revalidatePath`).
