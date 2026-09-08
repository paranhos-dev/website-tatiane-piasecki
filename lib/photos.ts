import { createAdminClient } from './supabase/server';
import { hasSupabase } from './env';
import {
  BibliotecaFoto, Ensaio, EnsaioFoto, GaleriaFoto, Gaveta, HERO_PARES, SiteSlot, SlotKey,
  SLOT_KEYS, SLOT_LABEL, Slots, slotsVazios, TextoKey, Textos, TEXTOS_PADRAO,
  UsoPorPublicId,
} from './data';

/** Só consulta o banco quando Supabase + service role estão configurados. */
function ligado() {
  return hasSupabase && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// ---------- site_slots ----------
export async function getSlots(): Promise<Slots> {
  const slots = slotsVazios();
  if (!ligado()) return slots;

  const { data, error } = await createAdminClient()
    .from('site_slots').select('key, url, public_id');
  if (error || !data) return slots;

  for (const linha of data as SiteSlot[]) {
    if (SLOT_KEYS.includes(linha.key)) slots[linha.key] = linha;
  }
  return slots;
}

// ---------- site_textos ----------
export async function getTextos(): Promise<Textos> {
  const textos: Textos = { ...TEXTOS_PADRAO };
  if (!ligado()) return textos;

  const { data, error } = await createAdminClient()
    .from('site_textos').select('key, valor');
  if (error || !data) return textos;

  for (const linha of data as { key: TextoKey; valor: string }[]) {
    if (linha.key in textos && linha.valor) textos[linha.key] = linha.valor;
  }
  return textos;
}

// ---------- ensaios ----------
export async function getEnsaios(apenasHome = false): Promise<Ensaio[]> {
  if (!ligado()) return [];

  let q = createAdminClient().from('ensaios').select('*');
  if (apenasHome) q = q.eq('na_home', true);

  const { data, error } = await q.order('posicao', { ascending: true });
  if (error || !data) return [];
  return data as Ensaio[];
}

// ---------- ensaio_fotos ----------
export async function getEnsaioFotos(ensaioId: string): Promise<EnsaioFoto[]> {
  if (!ligado()) return [];

  const { data, error } = await createAdminClient()
    .from('ensaio_fotos').select('*').eq('ensaio_id', ensaioId)
    .order('posicao', { ascending: true });
  if (error || !data) return [];
  return data as EnsaioFoto[];
}

/** Fotos de vários ensaios de uma vez, agrupadas por ensaio_id (evita N+1). */
export async function getFotosPorEnsaio(ids: string[]): Promise<Record<string, EnsaioFoto[]>> {
  const grupos: Record<string, EnsaioFoto[]> = {};
  for (const id of ids) grupos[id] = [];
  if (!ligado() || ids.length === 0) return grupos;

  const { data, error } = await createAdminClient()
    .from('ensaio_fotos').select('*').in('ensaio_id', ids)
    .order('posicao', { ascending: true });
  if (error || !data) return grupos;

  for (const foto of data as EnsaioFoto[]) {
    (grupos[foto.ensaio_id] ||= []).push(foto);
  }
  return grupos;
}

// ---------- galeria ----------
export async function getGaleria(apenasHome = false): Promise<GaleriaFoto[]> {
  if (!ligado()) return [];

  let q = createAdminClient().from('galeria').select('*');
  if (apenasHome) q = q.eq('na_home', true);

  const { data, error } = await q.order('posicao', { ascending: true });
  if (error || !data) return [];
  return data as GaleriaFoto[];
}

/** Página das fotos fora da home — alimenta o botão "ver mais" do carrossel. */
export async function getGaleriaExtra(offset: number, limite: number): Promise<GaleriaFoto[]> {
  if (!ligado() || limite <= 0) return [];

  const { data, error } = await createAdminClient()
    .from('galeria').select('*').eq('na_home', false)
    .order('posicao', { ascending: true })
    .range(offset, offset + limite - 1);
  if (error || !data) return [];
  return data as GaleriaFoto[];
}

/** Quantas fotos existem fora da home — o site só mostra "ver mais" se houver. */
export async function contarGaleriaExtra(): Promise<number> {
  if (!ligado()) return 0;

  const { count, error } = await createAdminClient()
    .from('galeria').select('id', { count: 'exact', head: true }).eq('na_home', false);
  if (error) return 0;
  return count ?? 0;
}

/** Quantos itens já estão na home — usado para respeitar o limite ao alternar a flag. */
export async function contarNaHome(tabela: 'ensaios' | 'galeria'): Promise<number> {
  if (!ligado()) return 0;

  const { count, error } = await createAdminClient()
    .from(tabela).select('id', { count: 'exact', head: true }).eq('na_home', true);
  if (error) return 0;
  return count ?? 0;
}

// ---------- biblioteca ----------
export type FiltrosBiblioteca = { categoria?: string; emUso?: boolean; colecao?: string };

export async function getBiblioteca(filtros?: FiltrosBiblioteca): Promise<BibliotecaFoto[]> {
  if (!ligado()) return [];

  let q = createAdminClient().from('biblioteca').select('*');
  if (filtros?.categoria && filtros.categoria !== 'todas') {
    q = q.eq('categoria', filtros.categoria);
  }
  if (filtros?.colecao && filtros.colecao !== 'todas') {
    q = q.eq('colecao', filtros.colecao);
  }

  const { data, error } = await q
    .order('posicao', { ascending: true })
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  const fotos = data as BibliotecaFoto[];
  if (filtros?.emUso === undefined) return fotos;

  // O filtro por uso depende do cruzamento com as outras tabelas.
  const uso = await getBibliotecaUso(fotos.map((f) => f.public_id));
  return fotos.filter((f) => (uso[f.public_id]?.length > 0) === filtros.emUso);
}

/** Rotulo legivel de cada slot do site ("Hero · bloco 1", "Sobre mim", ...). */
function rotuloDoSlot(key: SlotKey): string {
  const bloco = HERO_PARES.findIndex(([esq, dir]) => esq === key || dir === key);
  if (bloco >= 0) {
    const lado = HERO_PARES[bloco][0] === key ? 'esquerda' : 'direita';
    return `Hero · bloco ${bloco + 1} (${lado})`;
  }
  if (key === 'sobre_foto') return 'Sobre mim';
  if (key === 'cta_bg') return 'CTA';
  return SLOT_LABEL[key];
}

/**
 * Para cada public_id, onde aquela foto aparece no site. Uma consulta por tabela
 * em vez de uma por foto — o custo nao cresce com o tamanho da biblioteca.
 */
export async function getBibliotecaUso(publicIds: string[]): Promise<UsoPorPublicId> {
  const uso: UsoPorPublicId = {};
  for (const pid of publicIds) uso[pid] = [];
  if (!ligado() || publicIds.length === 0) return uso;

  const registrar = (pid: string | null | undefined, onde: string) => {
    if (pid && uso[pid] && !uso[pid].includes(onde)) uso[pid].push(onde);
  };

  const db = createAdminClient();
  const [slots, coberturas, fotosEnsaio, galeria] = await Promise.all([
    db.from('site_slots').select('key, public_id').in('public_id', publicIds),
    db.from('ensaios').select('titulo, cover_public_id').in('cover_public_id', publicIds),
    db.from('ensaio_fotos').select('public_id, ensaio_id').in('public_id', publicIds),
    db.from('galeria').select('public_id').in('public_id', publicIds),
  ]);

  for (const l of (slots.data ?? []) as { key: SlotKey; public_id: string }[]) {
    registrar(l.public_id, rotuloDoSlot(l.key));
  }
  for (const l of (coberturas.data ?? []) as { titulo: string; cover_public_id: string }[]) {
    registrar(l.cover_public_id, `Capa de "${l.titulo}"`);
  }

  // Os titulos dos ensaios das fotos internas vem numa consulta so.
  const linhasEnsaio = (fotosEnsaio.data ?? []) as { public_id: string; ensaio_id: string }[];
  if (linhasEnsaio.length) {
    const ids = Array.from(new Set(linhasEnsaio.map((l) => l.ensaio_id)));
    const { data: titulos } = await db.from('ensaios').select('id, titulo').in('id', ids);
    const porId: Record<string, string> = {};
    for (const e of (titulos ?? []) as { id: string; titulo: string }[]) porId[e.id] = e.titulo;
    for (const l of linhasEnsaio) {
      registrar(l.public_id, `Ensaio "${porId[l.ensaio_id] ?? '?'}"`);
    }
  }

  for (const l of (galeria.data ?? []) as { public_id: string }[]) {
    registrar(l.public_id, 'Galeria');
  }

  return uso;
}

/** Pastas persistidas (existem mesmo sem fotos). */
export type PastaItem = { nome: string; categoria: string };

export async function getPastas(): Promise<PastaItem[]> {
  if (!ligado()) return [];
  const { data, error } = await createAdminClient()
    .from('biblioteca_pastas').select('nome, categoria').order('nome', { ascending: true });
  if (error || !data) return [];
  return data as PastaItem[];
}

/**
 * Gavetas existentes com a contagem de fotos. O PostgREST nao faz GROUP BY, entao
 * agrupamos aqui — a lista de gavetas e curta e o custo e desprezivel.
 */
export async function getGavetas(): Promise<Gaveta[]> {
  if (!ligado()) return [];

  const { data, error } = await createAdminClient()
    .from('biblioteca').select('colecao').not('colecao', 'is', null);
  if (error || !data) return [];

  const contagem = new Map<string, number>();
  for (const linha of data as { colecao: string | null }[]) {
    const nome = (linha.colecao ?? '').trim();
    if (!nome) continue;
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }

  return Array.from(contagem, ([nome, total]) => ({ nome, total }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
