'use server';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { uploadBuffer, destroy } from '@/lib/cloudinary';
import { contarNaHome } from '@/lib/photos';
import {
  Categoria, CATEGORIAS, MAX_HOME, SlotKey, SLOT_KEYS, TabelaComHome, TabelaOrdenavel,
  TEXTO_KEYS,
} from '@/lib/data';

export type Resultado = { ok: boolean; erro?: string; id?: string };

const OK: Resultado = { ok: true };
const falha = (erro: string): Resultado => ({ ok: false, erro });

/**
 * Converte excecao em Resultado, para o painel mostrar a causa real em vez de uma
 * mensagem generica. O erro tambem vai para o log do servidor.
 */
/**
 * Extrai uma mensagem legivel de qualquer coisa lancada. String(e) num objeto simples
 * produz "[object Object]", que era o que chegava no alert do painel.
 */
function mensagemDoErro(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error && e.message) return e.message;

  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    // Formatos comuns de Supabase (AuthError / PostgrestError) e fetch.
    for (const campo of ['message', 'error_description', 'msg', 'details', 'hint', 'error']) {
      const v = o[campo];
      if (typeof v === 'string' && v) return v;
    }
    const code = typeof o.code === 'string' || typeof o.code === 'number' ? `${o.code}` : '';
    try {
      const json = JSON.stringify(e);
      if (json && json !== '{}') return code ? `${code}: ${json}` : json;
    } catch { /* referencia circular */ }
    if (code) return `Erro ${code}`;
  }

  return 'Erro desconhecido.';
}

async function executar(nome: string, fn: () => Promise<Resultado>): Promise<Resultado> {
  try {
    return await fn();
  } catch (e) {
    const msg = mensagemDoErro(e);
    // Objeto cru no log do servidor: a mensagem sozinha costuma esconder a causa.
    console.error(`[admin/${nome}]`, msg, e);
    return falha(msg);
  }
}

/** Toda action passa por aqui antes de tocar em Cloudinary ou banco. */
async function exigirSessao() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('[admin/exigirSessao]', mensagemDoErro(error), error);
    throw new Error('Sessão expirada. Recarregue a página e entre novamente.');
  }
  if (!data?.user) throw new Error('Sessão expirada. Recarregue a página e entre novamente.');
}

function pasta(sub: string) {
  return `${process.env.CLOUDINARY_FOLDER || 'template-fotografo'}/${sub}`;
}

/**
 * Server Actions so aceitam tipos serializaveis: File e File[] soltos sao rejeitados
 * com "Only plain objects... can be passed to Server Actions". Os arquivos precisam
 * viajar dentro de um FormData, e e daqui que eles saem.
 */
function arquivosDe(formData: FormData, campo = 'files'): File[] {
  return formData.getAll(campo)
    .filter((f): f is File => f instanceof File && f.size > 0);
}

async function subir(file: File, sub: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadBuffer(buffer, pasta(sub));
}

function atualizarSite() {
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/ensaios');
  revalidatePath('/galeria');
}

/** Próxima posição livre de uma lista ordenada. */
async function proximaPosicao(tabela: TabelaOrdenavel, ensaioId?: string) {
  const db = createAdminClient();
  let q = db.from(tabela).select('posicao');
  if (ensaioId) q = q.eq('ensaio_id', ensaioId);

  const { data } = await q.order('posicao', { ascending: false }).limit(1).maybeSingle();
  return ((data?.posicao as number | undefined) ?? -1) + 1;
}

// ---------- Slots do site ----------
export async function updateSlot(key: SlotKey, formData: FormData): Promise<Resultado> {
  return executar('updateSlot', async () => {
  const file = formData.get('file');
  await exigirSessao();
  if (!SLOT_KEYS.includes(key)) return falha('Slot desconhecido.');
  if (!(file instanceof File) || file.size === 0) return falha('Nenhum arquivo recebido.');

  const db = createAdminClient();
  const { data: atual } = await db
    .from('site_slots').select('public_id').eq('key', key).maybeSingle();

  const up = await subir(file, 'site');
  const { error } = await db.from('site_slots').upsert({
    key, url: up.secure_url, public_id: up.public_id, updated_at: new Date().toISOString(),
  });
  if (error) return falha(error.message);

  // A imagem antiga só sai do Cloudinary depois que a nova já está gravada.
  const anterior = atual?.public_id as string | undefined;
  if (anterior && anterior !== up.public_id) await destroy(anterior);

  atualizarSite();
  return OK;
  });
}

// ---------- Textos do site ----------
export async function updateTextos(formData: FormData): Promise<Resultado> {
  return executar('updateTextos', async () => {
    await exigirSessao();

    const linhas = TEXTO_KEYS
      .filter((key) => formData.get(key) !== null)
      .map((key) => ({ key, valor: String(formData.get(key) ?? '') }));
    if (linhas.length === 0) return OK;

    const { error } = await createAdminClient().from('site_textos').upsert(linhas);
    if (error) return falha(error.message);

    atualizarSite();
    return OK;
  });
}

// ---------- Ensaios ----------
export async function createEnsaio(formData: FormData): Promise<Resultado> {
  return executar('createEnsaio', async () => {
  await exigirSessao();

  const titulo = String(formData.get('titulo') ?? '').trim();
  const categoria = String(formData.get('categoria') ?? '') as Categoria;
  const data_ensaio = String(formData.get('data_ensaio') ?? '').trim() || null;
  const cover = formData.get('cover');

  if (!titulo) return falha('Informe o título do ensaio.');
  if (!CATEGORIAS.includes(categoria)) return falha('Escolha uma categoria válida.');

  let cover_url = String(formData.get('cover_url') ?? '').trim();
  let cover_public_id = String(formData.get('cover_public_id') ?? '').trim();

  // Fallback: se vier um arquivo (upload direto), sobe no Cloudinary.
  if (!cover_url && cover instanceof File && cover.size > 0) {
    const up = await subir(cover, 'ensaios');
    cover_url = up.secure_url;
    cover_public_id = up.public_id;
  }

  const posicao = await proximaPosicao('ensaios');
  const { error } = await createAdminClient().from('ensaios').insert({
    titulo, categoria, cover_url, cover_public_id, posicao, data_ensaio, na_home: false,
  });
  if (error) return falha(error.message);

  atualizarSite();
  return OK;
  });
}

export async function uploadEnsaioFotos(ensaioId: string, formData: FormData): Promise<Resultado> {
  return executar('uploadEnsaioFotos', async () => {
  const files = arquivosDe(formData);
  await exigirSessao();
  if (!ensaioId) return falha('Ensaio não informado.');
  if (files.length === 0) return falha('Nenhum arquivo recebido.');

  const db = createAdminClient();
  let posicao = await proximaPosicao('ensaio_fotos', ensaioId);

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const up = await subir(file, `ensaios/${ensaioId}`);
    const { error } = await db.from('ensaio_fotos').insert({
      ensaio_id: ensaioId, url: up.secure_url, public_id: up.public_id, posicao: posicao++,
    });
    if (error) return falha(error.message);
  }

  atualizarSite();
  return OK;
  });
}

export async function deleteEnsaio(id: string): Promise<Resultado> {
  return executar('deleteEnsaio', async () => {
    await exigirSessao();
    const db = createAdminClient();

    const { data: ensaio } = await db
      .from('ensaios').select('cover_public_id').eq('id', id).maybeSingle();
    const { data: fotos } = await db
      .from('ensaio_fotos').select('public_id').eq('ensaio_id', id);

    const publicIds = [
      ...((fotos ?? []) as { public_id: string }[]).map((f) => f.public_id),
      (ensaio?.cover_public_id as string | undefined) ?? '',
    ].filter(Boolean);

    await Promise.all(publicIds.map((pid) => destroy(pid)));

    // ensaio_fotos tem ON DELETE CASCADE, mas apagamos explicitamente para não
    // depender de o schema estar atualizado no projeto.
    await db.from('ensaio_fotos').delete().eq('ensaio_id', id);
    const { error } = await db.from('ensaios').delete().eq('id', id);
    if (error) return falha(error.message);

    atualizarSite();
    return OK;
  });
}

export async function deleteEnsaioFoto(id: string, publicId: string): Promise<Resultado> {
  return executar('deleteEnsaioFoto', async () => {
    await exigirSessao();
    await destroy(publicId);

    const { error } = await createAdminClient().from('ensaio_fotos').delete().eq('id', id);
    if (error) return falha(error.message);

    atualizarSite();
    return OK;
  });
}

// ---------- Galeria ----------
export async function uploadGaleria(formData: FormData): Promise<Resultado> {
  return executar('uploadGaleria', async () => {
  const files = arquivosDe(formData);
  await exigirSessao();
  if (files.length === 0) return falha('Nenhum arquivo recebido.');
  const db = createAdminClient();
  let posicao = await proximaPosicao('galeria');

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const up = await subir(file, 'galeria');
    const { error } = await db.from('galeria').insert({
      url: up.secure_url, public_id: up.public_id, posicao: posicao++, na_home: false,
    });
    if (error) return falha(error.message);
  }

  atualizarSite();
  return OK;
  });
}

export async function deleteGaleriaFoto(id: string, publicId: string): Promise<Resultado> {
  return executar('deleteGaleriaFoto', async () => {
    await exigirSessao();
    await destroy(publicId);

    const { error } = await createAdminClient().from('galeria').delete().eq('id', id);
    if (error) return falha(error.message);

    atualizarSite();
    return OK;
  });
}

// ---------- Flags e ordem ----------
export async function toggleNaHome(tabela: TabelaComHome, id: string): Promise<Resultado> {
  return executar('toggleNaHome', async () => {
    await exigirSessao();
    if (tabela !== 'ensaios' && tabela !== 'galeria') return falha('Tabela inválida.');

    const db = createAdminClient();
    const { data: atual, error: erroLeitura } = await db
      .from(tabela).select('na_home').eq('id', id).maybeSingle();
    if (erroLeitura) return falha(erroLeitura.message);
    if (!atual) return falha('Item não encontrado.');

    const novo = !atual.na_home;
    if (novo) {
      const limite = MAX_HOME[tabela];
      if ((await contarNaHome(tabela)) >= limite) {
        const oque = tabela === 'ensaios' ? 'ensaios' : 'fotos';
        return falha(`A home já tem ${limite} ${oque}. Remova um antes de adicionar outro.`);
      }
    }

    const { error } = await db.from(tabela).update({ na_home: novo }).eq('id', id);
    if (error) return falha(error.message);

    atualizarSite();
    return OK;
  });
}

export async function reordenar(tabela: TabelaOrdenavel, ids: string[]): Promise<Resultado> {
  return executar('reordenar', async () => {
    await exigirSessao();
    if (!['ensaios', 'ensaio_fotos', 'galeria'].includes(tabela)) return falha('Tabela inválida.');

    const db = createAdminClient();
    const respostas = await Promise.all(
      ids.map((id, i) => db.from(tabela).update({ posicao: i }).eq('id', id)),
    );
    const primeira = respostas.find((r) => r.error);
    if (primeira?.error) return falha(primeira.error.message);

    atualizarSite();
    return OK;
  });
}

