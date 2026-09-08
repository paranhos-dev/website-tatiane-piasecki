'use server';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { uploadBuffer, destroy } from '@/lib/cloudinary';
import { contarNaHome, getBibliotecaUso } from '@/lib/photos';
import {
  Categoria, CATEGORIAS, CategoriaBiblioteca, CATEGORIAS_BIBLIOTECA, MAX_HOME,
  SlotKey, SLOT_KEYS, TabelaComHome, TabelaOrdenavel, TEXTO_KEYS,
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

/** Atribui a um slot uma foto já existente na biblioteca (sem novo upload). */
export async function updateSlotFromBiblioteca(
  key: SlotKey, url: string, publicId: string,
): Promise<Resultado> {
  return executar('updateSlotFromBiblioteca', async () => {
    await exigirSessao();
    if (!SLOT_KEYS.includes(key)) return falha('Slot desconhecido.');

    const db = createAdminClient();
    const { error } = await db.from('site_slots').upsert({
      key, url, public_id: publicId, updated_at: new Date().toISOString(),
    });
    if (error) return falha(error.message);

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

/** Adiciona fotos da biblioteca a um ensaio (sem novo upload — só insere registros). */
export async function adicionarBibliotecaEnsaio(
  ensaioId: string, fotos: { url: string; public_id: string }[],
): Promise<Resultado> {
  return executar('adicionarBibliotecaEnsaio', async () => {
    await exigirSessao();
    if (!ensaioId || fotos.length === 0) return falha('Nenhuma foto informada.');
    const db = createAdminClient();
    let posicao = await proximaPosicao('ensaio_fotos', ensaioId);
    for (const f of fotos) {
      const { error } = await db.from('ensaio_fotos').insert({
        ensaio_id: ensaioId, url: f.url, public_id: f.public_id, posicao: posicao++,
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

/** Adiciona fotos já existentes na biblioteca à galeria (sem novo upload). */
export async function adicionarBibliotecaGaleria(ids: string[]): Promise<Resultado> {
  return executar('adicionarBibliotecaGaleria', async () => {
    await exigirSessao();
    if (ids.length === 0) return falha('Nenhuma foto selecionada.');
    const db = createAdminClient();

    // Busca url + public_id das fotos selecionadas na biblioteca.
    const { data, error: erroBusca } = await db
      .from('biblioteca').select('url, public_id').in('id', ids);
    if (erroBusca || !data) return falha(erroBusca?.message ?? 'Erro ao buscar fotos.');

    let posicao = await proximaPosicao('galeria');
    for (const foto of data as { url: string; public_id: string }[]) {
      const { error } = await db.from('galeria').insert({
        url: foto.url, public_id: foto.public_id, posicao: posicao++, na_home: false,
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

// ---------- Pastas da biblioteca ----------
export async function criarPasta(nome: string, categoria: string): Promise<Resultado> {
  return executar('criarPasta', async () => {
    await exigirSessao();
    const { error } = await createAdminClient()
      .from('biblioteca_pastas')
      .upsert({ nome: nome.trim(), categoria }, { onConflict: 'nome,categoria', ignoreDuplicates: true });
    if (error) return falha(error.message);
    atualizarSite();
    return OK;
  });
}

export async function deletarPasta(nome: string, categoria: string): Promise<Resultado> {
  return executar('deletarPasta', async () => {
    await exigirSessao();
    const { error } = await createAdminClient()
      .from('biblioteca_pastas')
      .delete()
      .eq('nome', nome)
      .eq('categoria', categoria);
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

// ---------- Biblioteca ----------
export async function uploadBiblioteca(formData: FormData): Promise<Resultado> {
  return executar('uploadBiblioteca', async () => {
    await exigirSessao();
    const files = arquivosDe(formData);
    if (files.length === 0) return falha('Nenhum arquivo recebido.');

    const categoria = String(formData.get('categoria') ?? '') as CategoriaBiblioteca;
    const valida = CATEGORIAS_BIBLIOTECA.includes(categoria) ? categoria : null;
    // Upload feito de dentro de uma pasta ja nasce com categoria e colecao.
    const colecao = String(formData.get('colecao') ?? '').trim().slice(0, 60) || null;

    const db = createAdminClient();
    const { data: ultima } = await db
      .from('biblioteca').select('posicao')
      .order('posicao', { ascending: false }).limit(1).maybeSingle();
    let posicao = ((ultima?.posicao as number | undefined) ?? -1) + 1;

    for (const file of files) {
      const up = await subir(file, 'biblioteca');
      const { error } = await db.from('biblioteca').insert({
        url: up.secure_url, public_id: up.public_id,
        categoria: valida, colecao, notas: '', posicao: posicao++,
      });
      if (error) return falha(error.message);
    }

    atualizarSite();
    return OK;
  });
}

export async function deleteBibliotecaFoto(id: string, publicId: string): Promise<Resultado> {
  return executar('deleteBibliotecaFoto', async () => {
    await exigirSessao();

    // Apagar uma foto em uso deixaria imagem quebrada no site.
    const uso = await getBibliotecaUso([publicId]);
    const onde = uso[publicId] ?? [];
    if (onde.length > 0) {
      return falha(`Esta foto está em uso em: ${onde.join(', ')}. Remova de lá antes de deletar.`);
    }

    await destroy(publicId);
    const { error } = await createAdminClient().from('biblioteca').delete().eq('id', id);
    if (error) return falha(error.message);

    atualizarSite();
    return OK;
  });
}

/** Deleta várias fotos da biblioteca em cascata (galeria, ensaios, slots, Cloudinary, biblioteca). */
export async function deleteBibliotecaLote(ids: string[]): Promise<Resultado> {
  return executar('deleteBibliotecaLote', async () => {
    await exigirSessao();
    if (ids.length === 0) return falha('Nenhuma foto selecionada.');
    const db = createAdminClient();

    const { data, error: erroBusca } = await db
      .from('biblioteca').select('id, public_id').in('id', ids);
    if (erroBusca || !data) return falha(erroBusca?.message ?? 'Erro ao buscar fotos.');

    const fotos = data as { id: string; public_id: string }[];
    const publicIds = fotos.map((f) => f.public_id);

    // Remove de todas as tabelas que referenciam por public_id.
    await Promise.all([
      db.from('galeria').delete().in('public_id', publicIds),
      db.from('ensaio_fotos').delete().in('public_id', publicIds),
      db.from('site_slots').delete().in('public_id', publicIds),
    ]);

    // Deleta do Cloudinary e da biblioteca.
    for (const foto of fotos) {
      await destroy(foto.public_id);
      await db.from('biblioteca').delete().eq('id', foto.id);
    }

    atualizarSite();
    return OK;
  });
}

export async function updateBibliotecaFoto(id: string, formData: FormData): Promise<Resultado> {
  return executar('updateBibliotecaFoto', async () => {
    await exigirSessao();

    const bruta = String(formData.get('categoria') ?? '').trim();
    const categoria = CATEGORIAS_BIBLIOTECA.includes(bruta as CategoriaBiblioteca)
      ? (bruta as CategoriaBiblioteca)
      : null;
    const notas = String(formData.get('notas') ?? '').trim().slice(0, 200);

    const { error } = await createAdminClient()
      .from('biblioteca').update({ categoria, notas }).eq('id', id);
    if (error) return falha(error.message);

    atualizarSite();
    return OK;
  });
}

export async function updateBibliotecaLote(ids: string[], categoria: string): Promise<Resultado> {
  return executar('updateBibliotecaLote', async () => {
    await exigirSessao();
    if (!ids.length) return falha('Nenhuma foto selecionada.');

    const cat = CATEGORIAS_BIBLIOTECA.includes(categoria as CategoriaBiblioteca)
      ? (categoria as CategoriaBiblioteca)
      : null;

    const { error } = await createAdminClient()
      .from('biblioteca').update({ categoria: cat }).in('id', ids);
    if (error) return falha(error.message);

    atualizarSite();
    return OK;
  });
}

// ---------- Gavetas ----------
/** Gaveta vazia ('') remove a foto de qualquer gaveta. */
export async function moverParaGaveta(ids: string[], colecao: string): Promise<Resultado> {
  return executar('moverParaGaveta', async () => {
    await exigirSessao();
    if (ids.length === 0) return falha('Nenhuma foto selecionada.');

    const nome = colecao.trim().slice(0, 60);
    const { error } = await createAdminClient()
      .from('biblioteca').update({ colecao: nome || null }).in('id', ids);
    if (error) return falha(error.message);

    atualizarSite();
    return OK;
  });
}

/**
 * Promove uma gaveta a ensaio. As fotos continuam na biblioteca — o ensaio referencia
 * as mesmas URLs do Cloudinary, e por isso elas passam a aparecer como "em uso".
 */
export async function criarEnsaioDeGaveta(colecao: string): Promise<Resultado> {
  return executar('criarEnsaioDeGaveta', async () => {
    await exigirSessao();
    const nome = colecao.trim();
    if (!nome) return falha('Gaveta não informada.');

    const db = createAdminClient();
    const { data: fotos, error: erroFotos } = await db
      .from('biblioteca').select('url, public_id')
      .eq('colecao', nome).order('posicao', { ascending: true });
    if (erroFotos) return falha(erroFotos.message);

    const lista = (fotos ?? []) as { url: string; public_id: string }[];
    if (lista.length === 0) return falha(`A gaveta "${nome}" está vazia.`);

    const [capa, ...demais] = lista;
    const posicao = await proximaPosicao('ensaios');

    const { data: criado, error } = await db.from('ensaios').insert({
      titulo: nome,
      categoria: 'familia' as Categoria,
      cover_url: capa.url,
      cover_public_id: capa.public_id,
      posicao,
      data_ensaio: null,
      na_home: false,
    }).select('id').single();
    if (error) return falha(error.message);

    const ensaioId = criado?.id as string;

    if (demais.length > 0) {
      const { error: erroFotosEnsaio } = await db.from('ensaio_fotos').insert(
        demais.map((f, i) => ({
          ensaio_id: ensaioId, url: f.url, public_id: f.public_id, posicao: i,
        })),
      );
      if (erroFotosEnsaio) return falha(erroFotosEnsaio.message);
    }

    atualizarSite();
    return { ok: true, id: ensaioId };
  });
}
