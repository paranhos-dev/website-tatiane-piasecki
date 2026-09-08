// Tipos do schema: site_slots, site_textos, ensaios, ensaio_fotos, galeria.

// ---------- site_slots ----------
export type SlotKey =
  | 'hero_1' | 'hero_2'
  | 'hero_1b' | 'hero_2b'
  | 'hero_1c' | 'hero_2c'
  | 'sobre_foto' | 'cta_bg';

export const SLOT_KEYS: SlotKey[] = [
  'hero_1', 'hero_2', 'hero_1b', 'hero_2b', 'hero_1c', 'hero_2c', 'sobre_foto', 'cta_bg',
];

/** Os 3 pares do slideshow do hero, na ordem em que se alternam. */
export const HERO_PARES: [SlotKey, SlotKey][] = [
  ['hero_1', 'hero_2'],
  ['hero_1b', 'hero_2b'],
  ['hero_1c', 'hero_2c'],
];

export type SiteSlot = { key: SlotKey; url: string; public_id: string };

export type Slots = Record<SlotKey, SiteSlot | null>;

export const SLOT_LABEL: Record<SlotKey, string> = {
  hero_1: 'Imagem da esquerda',
  hero_2: 'Imagem da direita',
  hero_1b: 'Imagem da esquerda',
  hero_2b: 'Imagem da direita',
  hero_1c: 'Imagem da esquerda',
  hero_2c: 'Imagem da direita',
  sobre_foto: 'Retrato',
  cta_bg: 'Imagem de fundo',
};

// Placeholders locais — o site roda inteiro antes de qualquer upload.
export const SLOT_PLACEHOLDER: Record<SlotKey, string> = {
  hero_1: '/assets/ph-hero-01.svg',
  hero_2: '/assets/ph-hero-02.svg',
  hero_1b: '/assets/ph-hero-03.svg',
  hero_2b: '/assets/ph-hero-04.svg',
  hero_1c: '/assets/ph-hero-05.svg',
  hero_2c: '/assets/ph-hero-06.svg',
  sobre_foto: '/assets/ph-retrato.svg',
  cta_bg: '/assets/ph-l-02.svg',
};

export function slotsVazios(): Slots {
  return {
    hero_1: null, hero_2: null,
    hero_1b: null, hero_2b: null,
    hero_1c: null, hero_2c: null,
    sobre_foto: null, cta_bg: null,
  };
}

/** URL do slot com fallback no placeholder. */
export function slotUrl(slots: Slots, key: SlotKey): string {
  return slots[key]?.url || SLOT_PLACEHOLDER[key];
}

// ---------- site_textos ----------
// O nome do estudio e fixo no template; o titulo do "sobre mim" e a bio vem do banco.
export const MARCA = 'ESTÚDIO NOME';

export type TextoKey = 'sobre_bio' | 'sobre_titulo' | 'cta_titulo' | 'cta_sub' | 'cta_botao';

export const TEXTO_KEYS: TextoKey[] = ['sobre_bio', 'sobre_titulo', 'cta_titulo', 'cta_sub', 'cta_botao'];

export type Textos = Record<TextoKey, string>;

export const TEXTOS_PADRAO: Textos = {
  sobre_titulo: 'Prazer, eu fotografo histórias',
  sobre_bio:
    'Trabalho com luz natural, tempo e silêncio. Meu papel é desaparecer o suficiente ' +
    'para que o dia aconteça — e estar no lugar certo quando ele acontece.\n\n' +
    'Atendo famílias, recém-nascidos e ensaios em todo o país. Cada entrega é pensada ' +
    'para durar décadas, não semanas.',
  cta_titulo: 'Elegante. Íntimo. Para sempre.',
  cta_sub: 'Deixe-me contar a sua história',
  cta_botao: 'Fale comigo',
};

// ---------- ensaios ----------
export type Categoria =
  | 'familia'
  | 'recem-nascido'
  | 'gestante'
  | 'infantil'
  | 'casal'
  | 'ensaio-externo'
  | 'evento';

export const CATEGORIAS: Categoria[] = [
  'familia', 'recem-nascido', 'gestante', 'infantil', 'casal', 'ensaio-externo', 'evento',
];

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  'familia': 'Família',
  'recem-nascido': 'Recém-nascido',
  'gestante': 'Gestante',
  'infantil': 'Infantil',
  'casal': 'Casal',
  'ensaio-externo': 'Ensaio externo',
  'evento': 'Evento',
};

export type Ensaio = {
  id: string;
  titulo: string;
  categoria: Categoria;
  cover_url: string;
  cover_public_id: string;
  na_home: boolean;
  posicao: number;
  data_ensaio: string | null;
};

// ---------- ensaio_fotos ----------
export type EnsaioFoto = {
  id: string;
  ensaio_id: string;
  url: string;
  public_id: string;
  posicao: number;
};

// ---------- galeria ----------
export type GaleriaFoto = {
  id: string;
  url: string;
  public_id: string;
  posicao: number;
  na_home: boolean;
};

// ---------- biblioteca ----------
/** A biblioteca aceita as categorias dos ensaios mais "outro" para o que nao se encaixa. */
export type CategoriaBiblioteca = Categoria | 'outro';

export const CATEGORIAS_BIBLIOTECA: CategoriaBiblioteca[] = [...CATEGORIAS, 'outro'];

export const CATEGORIA_BIBLIOTECA_LABEL: Record<CategoriaBiblioteca, string> = {
  ...CATEGORIA_LABEL,
  outro: 'Outro',
};

export type BibliotecaFoto = {
  id: string;
  url: string;
  public_id: string;
  categoria: CategoriaBiblioteca | null;
  /** Nome da gaveta. null = fora de qualquer gaveta. */
  colecao: string | null;
  notas: string;
  posicao: number;
  created_at: string;
};

/** Gaveta = agrupamento livre de fotos da biblioteca, com a contagem atual. */
export type Gaveta = { nome: string; total: number };


/** Um lugar do site onde a foto esta sendo usada. */
export type BibliotecaUso = { onde: string };

/** public_id -> rotulos de onde a foto aparece. Vazio significa disponivel. */
export type UsoPorPublicId = Record<string, string[]>;

export type FiltroCategoria = CategoriaBiblioteca | 'todas';
export type FiltroStatus = 'todos' | 'em-uso' | 'disponivel';

export const BIBLIOTECA_POR_PAGINA = 24;

// ---------- Limites da home ----------
export const MAX_HOME_ENSAIOS = 6;
export const MAX_HOME_GALERIA = 12;

export type TabelaComHome = 'ensaios' | 'galeria';
export type TabelaOrdenavel = 'ensaios' | 'ensaio_fotos' | 'galeria';

export const MAX_HOME: Record<TabelaComHome, number> = {
  ensaios: MAX_HOME_ENSAIOS,
  galeria: MAX_HOME_GALERIA,
};

/** Formata 'YYYY-MM-DD' como 'mar 2025'. Vazio quando não houver data. */
export function dataCurta(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
}
