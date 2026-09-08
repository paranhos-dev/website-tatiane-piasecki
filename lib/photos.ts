import { createAdminClient } from './supabase/server';
import { hasSupabase } from './env';
import {
  Ensaio, EnsaioFoto, GaleriaFoto, SiteSlot, SLOT_KEYS, Slots, slotsVazios, TextoKey,
  Textos, TEXTOS_PADRAO,
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

