'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  BIBLIOTECA_POR_PAGINA, BibliotecaFoto, CategoriaBiblioteca, CATEGORIAS,
  CATEGORIAS_BIBLIOTECA, CATEGORIA_BIBLIOTECA_LABEL, CATEGORIA_LABEL, dataCurta, Ensaio,
  EnsaioFoto, FiltroCategoria, FiltroStatus, GaleriaFoto, Gaveta,
  HERO_PARES, MARCA, MAX_HOME_ENSAIOS, MAX_HOME_GALERIA, SlotKey, SLOT_PLACEHOLDER,
  Slots, Textos, UsoPorPublicId,
} from '@/lib/data';
import type { Resultado } from './actions';
import {
  adicionarBibliotecaEnsaio, adicionarBibliotecaGaleria, criarEnsaioDeGaveta, criarPasta, createEnsaio, deletarPasta,
  deleteBibliotecaFoto, deleteBibliotecaLote, deleteEnsaio, deleteEnsaioFoto,
  deleteGaleriaFoto, moverParaGaveta, reordenar, toggleNaHome, updateBibliotecaFoto,
  updateBibliotecaLote, updateSlot, updateSlotFromBiblioteca, updateTextos, uploadBiblioteca,
  uploadEnsaioFotos, uploadGaleria,
} from './actions';
import type { PastaItem } from '@/lib/photos';

type Props = {
  email: string;
  slots: Slots;
  textos: Textos;
  ensaios: Ensaio[];
  fotosPorEnsaio: Record<string, EnsaioFoto[]>;
  galeria: GaleriaFoto[];
  biblioteca: BibliotecaFoto[];
  usoBiblioteca: UsoPorPublicId;
  gavetas: Gaveta[];
  pastas: PastaItem[];
};

/** Abre o seletor de arquivos sem precisar de <input> escondido no DOM. */
function escolherArquivos(multiplo = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiplo;
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.oncancel = () => resolve([]);
    input.click();
  });
}

// ---------- Peças visuais ----------
function Secao(
  { numero, titulo, ajuda, children, id }:
  { numero: string; titulo: string; ajuda: string; children: React.ReactNode; id?: string },
) {
  return (
    <section
      id={id}
      className="border-t border-black/10 py-12 scroll-mt-24"
    >
      <div className="mb-7">
        <div className="flex items-baseline gap-4">
          <span className="text-[11px] tracking-[0.28em] text-ouro">{numero}</span>
          <h2 className="font-serif text-2xl md:text-3xl uppercase tracking-[0.12em] font-light">
            {titulo}
          </h2>
        </div>
        <p className="mt-2 text-sm text-black/55 max-w-2xl">{ajuda}</p>
      </div>
      {children}
    </section>
  );
}

function Etiqueta({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={
        'px-2 py-1 text-[10px] uppercase tracking-[0.16em] border ' +
        (ativo ? 'border-ouro text-ouro' : 'border-black/20 text-black/45')
      }
    >
      {ativo ? 'na home' : 'oculto'}
    </span>
  );
}

function SlotFoto(
  { chave, rotulo, slots, ocupado, onTrocar }:
  {
    chave: SlotKey; rotulo: string; slots: Slots; ocupado: boolean;
    onTrocar: (chave: SlotKey) => void;
  },
) {
  const slot = slots[chave];
  const url = slot?.url || SLOT_PLACEHOLDER[chave];

  return (
    <button
      type="button"
      onClick={() => onTrocar(chave)}
      disabled={ocupado}
      className="group relative block w-full text-left border border-black/10 bg-white overflow-hidden disabled:opacity-50"
    >
      <img src={url} alt="" className="w-full h-52 object-cover" />
      {!slot && (
        <span className="absolute top-2 left-2 px-2 py-1 bg-white/85 text-[10px] uppercase tracking-[0.16em] text-black/55">
          exemplo
        </span>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white text-[11px] uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition">
        Trocar imagem
      </span>
      <span className="block px-3 py-2 text-[11px] uppercase tracking-[0.16em] border-t border-black/10">
        {rotulo}
      </span>
    </button>
  );
}

function Setas(
  { i, total, onMover }: { i: number; total: number; onMover: (d: number) => void },
) {
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onMover(-1)} disabled={i === 0}
        aria-label="Mover para trás" className="px-1.5 hover:text-ouro disabled:opacity-30"
      >
        ←
      </button>
      <button
        onClick={() => onMover(1)} disabled={i === total - 1}
        aria-label="Mover para frente" className="px-1.5 hover:text-ouro disabled:opacity-30"
      >
        →
      </button>
    </div>
  );
}

// ---------- Biblioteca ----------
function StatCard({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="flex-1 min-w-[110px] border border-black/10 bg-white px-4 py-3">
      <div className="font-serif text-3xl leading-none">{valor}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-black/50">{rotulo}</div>
    </div>
  );
}

function Pill(
  { ativo, onClick, children }:
  { ativo: boolean; onClick: () => void; children: React.ReactNode },
) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] border transition ' +
        (ativo
          ? 'bg-tinta text-white border-tinta'
          : 'border-black/20 text-black/60 hover:border-ouro hover:text-ouro')
      }
    >
      {children}
    </button>
  );
}

function CardBiblioteca(
  { foto, onde, ocupado, selecionado, onEditar, onSelecionar }:
  {
    foto: BibliotecaFoto; onde: string[]; ocupado: boolean; selecionado: boolean;
    onEditar: () => void; onSelecionar: () => void;
  },
) {
  return (
    <figure className={`relative bg-white border ${selecionado ? 'border-ouro border-2' : !foto.categoria ? 'border-ouro/50' : 'border-black/10'}`}>
      <div className="relative">
        <img src={foto.url} alt="" className="w-full h-40 object-cover block cursor-pointer" loading="lazy" onClick={onSelecionar} />
        {selecionado && (
          <div className="absolute inset-0 bg-ouro/20 pointer-events-none" />
        )}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
          <input
            type="checkbox" checked={selecionado} onChange={onSelecionar}
            className="w-4 h-4 accent-ouro cursor-pointer"
            aria-label="Selecionar foto"
          />
        </div>
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          <button
            type="button" onClick={onEditar} disabled={ocupado}
            aria-label="Editar categoria e notas"
            className="px-1.5 py-0.5 bg-white/90 text-[11px] hover:text-ouro border border-black/10"
          >
            ✎
          </button>
        </div>
      </div>

      <figcaption className="px-2 py-2 space-y-1.5">
        {!foto.categoria ? (
          <button
            type="button" onClick={onEditar} disabled={ocupado}
            className="block w-full py-1 bg-ouro/10 text-center text-[10px] uppercase tracking-[0.16em] text-ouro font-medium hover:bg-ouro/20 transition"
          >
            Categorizar →
          </button>
        ) : (
          <span className="block text-[10px] uppercase tracking-[0.14em] text-black/45">
            {CATEGORIA_BIBLIOTECA_LABEL[foto.categoria]}
          </span>
        )}
        <span
          className={
            'block px-1.5 py-1 text-[10px] uppercase tracking-[0.12em] border truncate ' +
            (onde.length > 0
              ? 'border-green-700/40 text-green-800 bg-green-50'
              : 'border-black/15 text-black/45')
          }
          title={onde.length > 0 ? onde.join(' · ') : undefined}
        >
          {onde.length > 0 ? onde.join(' · ') : 'disponível'}
        </span>
        {foto.notas && (
          <span className="block text-[11px] text-black/50 truncate">{foto.notas}</span>
        )}
      </figcaption>
    </figure>
  );
}

function ModalEditarFoto(
  { foto, ocupado, onFechar, onSalvar }:
  {
    foto: BibliotecaFoto; ocupado: boolean;
    onFechar: () => void; onSalvar: (fd: FormData) => void;
  },
) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-6"
      onClick={(e) => { if (e.target === e.currentTarget && !ocupado) onFechar(); }}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); onSalvar(new FormData(e.currentTarget)); }}
        className="w-full max-w-sm bg-papel border border-black/15 p-7 max-h-[90vh] overflow-y-auto"
      >
        <img src={foto.url} alt="" className="w-full h-44 object-cover mb-5 border border-black/10" />

        <label className="block text-[11px] uppercase tracking-[0.18em] mb-1">Categoria</label>
        <select
          name="categoria" defaultValue={foto.categoria ?? ''}
          className="w-full mb-5 border border-black/20 bg-transparent px-3 py-2 outline-none focus:border-ouro"
        >
          <option value="">Sem categoria</option>
          {CATEGORIAS_BIBLIOTECA.map((c) => (
            <option key={c} value={c}>{CATEGORIA_BIBLIOTECA_LABEL[c]}</option>
          ))}
        </select>

        <label className="block text-[11px] uppercase tracking-[0.18em] mb-1">Notas</label>
        <input
          name="notas" defaultValue={foto.notas} maxLength={200}
          placeholder="ex.: Maria e Joao, dezembro"
          className="w-full mb-7 border border-black/20 bg-transparent px-3 py-2 outline-none focus:border-ouro"
        />

        <div className="flex gap-3">
          <button
            type="submit" disabled={ocupado}
            className="flex-1 py-3 bg-tinta text-white text-[11px] uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {ocupado ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            type="button" onClick={onFechar} disabled={ocupado}
            className="px-5 py-3 border border-black/20 text-[11px] uppercase tracking-[0.2em] hover:border-ouro disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Modal de confirmação ----------
function ModalConfirmar(
  { mensagem, onConfirmar, onCancelar }:
  { mensagem: string; onConfirmar: () => void; onCancelar: () => void },
) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
      onClick={(e) => { if (e.target === e.currentTarget) onCancelar(); }}
    >
      <div className="w-full max-w-sm bg-papel border border-black/15 p-8">
        <p className="text-sm leading-relaxed mb-7 text-black/80">{mensagem}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirmar}
            className="flex-1 py-3 bg-tinta text-white text-[11px] uppercase tracking-[0.2em] hover:bg-black"
          >
            Confirmar
          </button>
          <button
            onClick={onCancelar}
            className="px-5 py-3 border border-black/20 text-[11px] uppercase tracking-[0.2em] hover:border-ouro"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Modal de selecionar fotos da biblioteca (com navegação) ----------
function ModalSelecionarFotos(
  { biblioteca, pastas, fixarCategoria, labelConfirmar, jaUsadas, modoSingle, onConfirmar, onCancelar }:
  {
    biblioteca: BibliotecaFoto[];
    pastas: PastaItem[];
    fixarCategoria?: CategoriaBiblioteca;
    labelConfirmar?: string;
    jaUsadas?: Set<string>;
    /** Seleção única: confirma imediatamente ao clicar na foto. */
    modoSingle?: boolean;
    onConfirmar: (ids: string[]) => void;
    onCancelar: () => void;
  },
) {
  const [cat, setCat] = useState<CategoriaBiblioteca | null>(fixarCategoria ?? null);
  const [pasta, setPasta] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    if (modoSingle) { onConfirmar([id]); return; }
    setSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const pastasDaCat: PastaItem[] = cat ? pastas.filter((p) => p.categoria === cat) : [];

  const fotosVisiveis: BibliotecaFoto[] = cat
    ? biblioteca.filter((f) => {
        if (f.categoria !== cat) return false;
        return pasta !== null ? f.colecao === pasta : !f.colecao;
      })
    : [];

  function toggleTodas() {
    setSel(sel.size === fotosVisiveis.length
      ? new Set()
      : new Set(fotosVisiveis.map((f) => f.id)));
  }

  function voltarUm() {
    if (pasta !== null) { setPasta(null); return; }
    if (fixarCategoria) { onCancelar(); return; }
    setCat(null);
  }

  const titulo = !cat
    ? 'Escolher categoria'
    : pasta !== null
      ? pasta
      : CATEGORIA_BIBLIOTECA_LABEL[cat];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancelar(); }}
    >
      <div className="w-full max-w-3xl bg-papel border border-black/15 flex flex-col max-h-[85vh]">

        {/* cabeçalho */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-black/10">
          {(cat || fixarCategoria) && (
            <button onClick={voltarUm} className="text-black/45 hover:text-ouro text-lg leading-none">←</button>
          )}
          <span className="text-sm font-medium flex-1 truncate">{titulo}</span>
          {sel.size > 0 && (
            <span className="text-[11px] text-ouro uppercase tracking-[0.14em] shrink-0">
              {sel.size} sel.
            </span>
          )}
          {cat && (
            <button
              onClick={toggleTodas}
              className="text-[11px] uppercase tracking-[0.16em] text-black/45 hover:text-ouro shrink-0"
            >
              {sel.size === fotosVisiveis.length && fotosVisiveis.length > 0 ? 'Desmarcar' : 'Todas'}
            </button>
          )}
          <button onClick={onCancelar} className="text-[11px] uppercase tracking-[0.16em] text-black/35 hover:text-black ml-1">✕</button>
        </div>

        {/* conteúdo */}
        <div className="overflow-y-auto p-5 flex-1">

          {/* tela 1 — categorias */}
          {!cat && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIAS_BIBLIOTECA.map((c) => {
                const qtd = biblioteca.filter((f) => f.categoria === c).length;
                return (
                  <button key={c} onClick={() => { setCat(c); setPasta(null); setSel(new Set()); }}
                    className="flex flex-col items-start px-4 py-4 border border-black/12 hover:border-ouro text-left transition"
                  >
                    <span className="text-sm font-medium">{CATEGORIA_BIBLIOTECA_LABEL[c]}</span>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-black/40 mt-0.5">
                      {qtd} {qtd === 1 ? 'foto' : 'fotos'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* tela 2 — pastas + fotos soltas */}
          {cat && pasta === null && (
            <div className="space-y-4">
              {pastasDaCat.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-black/35 mb-3">Pastas</div>
                  <div className="flex flex-wrap gap-3 mb-2">
                    {pastasDaCat.map((p) => {
                      const qtd = biblioteca.filter((f) => f.categoria === cat && f.colecao === p.nome).length;
                      return (
                        <button key={p.nome} onClick={() => { setPasta(p.nome); setSel(new Set()); }}
                          className="flex flex-col items-center gap-1 px-3 py-3 w-24 border border-black/12 hover:border-ouro transition"
                        >
                          <svg viewBox="0 0 96 80" xmlns="http://www.w3.org/2000/svg" className="w-10 h-8">
                            <rect x="4" y="18" width="88" height="58" rx="5" fill="#d4c4a0" opacity="0.35"/>
                            <rect x="0" y="20" width="96" height="56" rx="5" fill="#e8d9b8"/>
                            <path d="M0 25 L96 25 L96 20 Q96 14 90 14 L42 14 Q40 14 38 18 L36 22 L6 22 Q0 22 0 25Z" fill="#d4c49a"/>
                          </svg>
                          <span className="text-[10px] text-center leading-tight text-black/70 truncate w-full">{p.nome}</span>
                          <span className="text-[9px] uppercase tracking-[0.12em] text-black/35">{qtd} fotos</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {fotosVisiveis.length > 0 && (
                <div>
                  {pastasDaCat.length > 0 && (
                    <div className="text-[10px] uppercase tracking-[0.2em] text-black/35 mb-3">Fotos soltas</div>
                  )}
                  <GradeFotos fotos={fotosVisiveis} sel={sel} onToggle={toggle} jaUsadas={jaUsadas} />
                </div>
              )}
              {pastasDaCat.length === 0 && fotosVisiveis.length === 0 && (
                <p className="text-sm text-black/45 py-8 text-center">Nenhuma foto nesta categoria.</p>
              )}
            </div>
          )}

          {/* tela 3 — fotos dentro de uma pasta */}
          {cat && pasta !== null && (
            fotosVisiveis.length === 0
              ? <p className="text-sm text-black/45 py-8 text-center">Pasta vazia.</p>
              : <GradeFotos fotos={fotosVisiveis} sel={sel} onToggle={toggle} />
          )}
        </div>

        {/* rodapé */}
        {cat && (
          <div className="flex items-center gap-3 px-5 py-4 border-t border-black/10">
            <button
              onClick={() => onConfirmar(Array.from(sel))}
              disabled={sel.size === 0}
              className="flex-1 py-3 bg-tinta text-white text-[11px] uppercase tracking-[0.2em] hover:bg-black disabled:opacity-40"
            >
              {labelConfirmar ?? 'Confirmar seleção'} {sel.size > 0 && `(${sel.size})`}
            </button>
            <button onClick={onCancelar}
              className="px-5 py-3 border border-black/20 text-[11px] uppercase tracking-[0.2em] hover:border-ouro"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GradeFotos(
  { fotos, sel, onToggle, jaUsadas }:
  {
    fotos: BibliotecaFoto[];
    sel: Set<string>;
    onToggle: (id: string) => void;
    jaUsadas?: Set<string>;
  },
) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {fotos.map((f) => {
        const ativa = sel.has(f.id);
        const emUso = jaUsadas?.has(f.public_id) ?? false;
        return (
          <button key={f.id} type="button"
            onClick={() => { if (!emUso) onToggle(f.id); }}
            className={'relative aspect-square overflow-hidden border-2 transition ' +
              (ativa ? 'border-ouro' : emUso ? 'border-black/30 cursor-not-allowed' : 'border-transparent hover:border-black/20')}
          >
            <img src={f.url} alt="" className="w-full h-full object-cover" />
            {emUso && !ativa && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                <span className="text-white text-[9px] uppercase tracking-[0.18em] font-medium text-center px-1 leading-tight">
                  Já na<br />galeria
                </span>
              </div>
            )}
            {ativa && (
              <div className="absolute inset-0 bg-ouro/20 flex items-center justify-center">
                <span className="text-white text-xl font-bold drop-shadow">✓</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Input de data DD/MM/AAAA sem calendário nativo ----------
function InputData({ name, className }: { name: string; className?: string }) {
  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [aaaa, setAaaa] = useState('');
  const refMm = useState<HTMLInputElement | null>(null);
  const refAaaa = useState<HTMLInputElement | null>(null);

  // Valor em YYYY-MM-DD para o campo hidden que vai no FormData.
  const iso = aaaa.length === 4 && mm.length === 2 && dd.length === 2
    ? `${aaaa}-${mm}-${dd}`
    : '';

  function apenasNumeros(v: string) { return v.replace(/\D/g, ''); }

  function onDd(e: React.ChangeEvent<HTMLInputElement>) {
    const v = apenasNumeros(e.target.value).slice(0, 2);
    setDd(v);
    if (v.length === 2) (refMm[0] as HTMLInputElement | null)?.focus();
  }

  function onMm(e: React.ChangeEvent<HTMLInputElement>) {
    const v = apenasNumeros(e.target.value).slice(0, 2);
    setMm(v);
    if (v.length === 2) (refAaaa[0] as HTMLInputElement | null)?.focus();
  }

  function onAaaa(e: React.ChangeEvent<HTMLInputElement>) {
    setAaaa(apenasNumeros(e.target.value).slice(0, 4));
  }

  return (
    <div className={`flex items-center border border-black/20 focus-within:border-ouro ${className ?? ''}`}>
      <input
        inputMode="numeric" placeholder="DD" value={dd} onChange={onDd}
        className="w-10 bg-transparent px-2 py-2 outline-none text-center text-sm"
      />
      <span className="text-black/30 select-none">/</span>
      <input
        inputMode="numeric" placeholder="MM" value={mm} onChange={onMm}
        ref={(el) => { refMm[0] = el; }}
        className="w-10 bg-transparent px-2 py-2 outline-none text-center text-sm"
      />
      <span className="text-black/30 select-none">/</span>
      <input
        inputMode="numeric" placeholder="AAAA" value={aaaa} onChange={onAaaa}
        ref={(el) => { refAaaa[0] = el; }}
        className="w-16 bg-transparent px-2 py-2 outline-none text-center text-sm"
      />
      {/* campo oculto que vai no FormData */}
      <input type="hidden" name={name} value={iso} />
    </div>
  );
}

// ---------- Modal de novo ensaio ----------
function ModalNovoEnsaio(
  { onFechar, onCriar, ocupado, biblioteca, pastas }:
  {
    onFechar: () => void;
    onCriar: (fd: FormData) => void;
    ocupado: boolean;
    biblioteca: BibliotecaFoto[];
    pastas: PastaItem[];
  },
) {
  const [capa, setCapa] = useState<{ url: string; public_id: string } | null>(null);
  // navegação do picker: null = escolher categoria
  const [pickerCat, setPickerCat] = useState<CategoriaBiblioteca | null>(null);
  const [pickerPasta, setPickerPasta] = useState<string | null>(null);
  const [pickerAberto, setPickerAberto] = useState(false);

  // Fotos e pastas do picker filtradas pela navegação atual
  const pastasDoPicker: PastaItem[] = pickerCat
    ? pastas.filter((p) => p.categoria === pickerCat)
    : [];

  const fotosDoPicker: BibliotecaFoto[] = pickerCat
    ? biblioteca.filter((f) => {
        if (f.categoria !== pickerCat) return false;
        if (pickerPasta !== null) return f.colecao === pickerPasta;
        return !f.colecao;
      })
    : [];

  function selecionarCapa(foto: BibliotecaFoto) {
    setCapa({ url: foto.url, public_id: foto.public_id });
    setPickerAberto(false);
  }

  function abrirPicker() {
    setPickerCat(null);
    setPickerPasta(null);
    setPickerAberto(true);
  }

  if (pickerAberto) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-3xl bg-papel border border-black/15 flex flex-col max-h-[85vh]">
          {/* cabeçalho do picker */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-black/10">
            {pickerCat && (
              <button
                onClick={() => { setPickerPasta(null); if (pickerPasta !== null) return; setPickerCat(null); }}
                className="text-[11px] uppercase tracking-[0.16em] text-black/50 hover:text-ouro"
              >
                ←
              </button>
            )}
            <span className="text-sm font-medium">
              {!pickerCat && 'Escolher foto de capa'}
              {pickerCat && !pickerPasta && CATEGORIA_BIBLIOTECA_LABEL[pickerCat]}
              {pickerCat && pickerPasta && (
                <span className="flex items-center gap-2">
                  <button onClick={() => setPickerPasta(null)} className="text-black/50 hover:text-ouro">
                    {CATEGORIA_BIBLIOTECA_LABEL[pickerCat]}
                  </button>
                  <span className="text-black/25">/</span>
                  <span>{pickerPasta}</span>
                </span>
              )}
            </span>
            <button
              onClick={() => setPickerAberto(false)}
              className="ml-auto text-[11px] uppercase tracking-[0.16em] text-black/40 hover:text-black"
            >
              Cancelar
            </button>
          </div>

          <div className="overflow-y-auto p-5 flex-1">
            {/* tela 1: escolher categoria */}
            {!pickerCat && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CATEGORIAS_BIBLIOTECA.map((c) => {
                  const qtd = biblioteca.filter((f) => f.categoria === c).length;
                  return (
                    <button
                      key={c}
                      onClick={() => { setPickerCat(c); setPickerPasta(null); }}
                      className="flex flex-col items-start px-4 py-4 border border-black/12 hover:border-ouro text-left transition"
                    >
                      <span className="text-sm font-medium">{CATEGORIA_BIBLIOTECA_LABEL[c]}</span>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-black/40 mt-0.5">
                        {qtd} {qtd === 1 ? 'foto' : 'fotos'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* tela 2: pastas + fotos soltas da categoria */}
            {pickerCat && pickerPasta === null && (
              <div className="space-y-4">
                {pastasDoPicker.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-black/35 mb-3">Pastas</div>
                    <div className="flex flex-wrap gap-3 mb-4">
                      {pastasDoPicker.map((p) => {
                        const qtd = biblioteca.filter((f) => f.categoria === pickerCat && f.colecao === p.nome).length;
                        return (
                          <button
                            key={p.nome}
                            onClick={() => setPickerPasta(p.nome)}
                            className="flex flex-col items-center gap-1.5 px-3 py-3 w-24 border border-black/12 hover:border-ouro transition"
                          >
                            <svg viewBox="0 0 96 80" xmlns="http://www.w3.org/2000/svg" className="w-10 h-8">
                              <rect x="4" y="18" width="88" height="58" rx="5" fill="#d4c4a0" opacity="0.35" />
                              <rect x="0" y="20" width="96" height="56" rx="5" fill="#e8d9b8" />
                              <path d="M0 25 L96 25 L96 20 Q96 14 90 14 L42 14 Q40 14 38 18 L36 22 L6 22 Q0 22 0 25Z" fill="#d4c49a" />
                            </svg>
                            <span className="text-[10px] text-center leading-tight text-black/70 truncate w-full">{p.nome}</span>
                            <span className="text-[9px] uppercase tracking-[0.12em] text-black/35">{qtd} fotos</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {fotosDoPicker.length > 0 && (
                  <div>
                    {pastasDoPicker.length > 0 && (
                      <div className="text-[10px] uppercase tracking-[0.2em] text-black/35 mb-3">Fotos soltas</div>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {fotosDoPicker.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => selecionarCapa(f)}
                          className="aspect-square overflow-hidden border-2 border-transparent hover:border-ouro transition"
                        >
                          <img src={f.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {pastasDoPicker.length === 0 && fotosDoPicker.length === 0 && (
                  <p className="text-sm text-black/45 py-8 text-center">
                    Nenhuma foto nesta categoria ainda.
                  </p>
                )}
              </div>
            )}

            {/* tela 3: fotos dentro de uma pasta */}
            {pickerCat && pickerPasta !== null && (
              <div>
                {fotosDoPicker.length === 0 ? (
                  <p className="text-sm text-black/45 py-8 text-center">Pasta vazia.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {fotosDoPicker.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => selecionarCapa(f)}
                        className="aspect-square overflow-hidden border-2 border-transparent hover:border-ouro transition"
                      >
                        <img src={f.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-6"
      onClick={(e) => { if (e.target === e.currentTarget && !ocupado) onFechar(); }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          if (capa) {
            fd.set('cover_url', capa.url);
            fd.set('cover_public_id', capa.public_id);
          }
          onCriar(fd);
        }}
        className="w-full max-w-md bg-papel border border-black/15 p-8 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="font-serif text-2xl uppercase tracking-[0.12em] font-light mb-6">
          Novo ensaio
        </h3>

        <label className="block text-[11px] uppercase tracking-[0.18em] mb-1">Título</label>
        <input
          name="titulo" required autoFocus
          className="w-full mb-5 border border-black/20 bg-transparent px-3 py-2 outline-none focus:border-ouro"
        />

        <label className="block text-[11px] uppercase tracking-[0.18em] mb-1">Categoria</label>
        <select
          name="categoria" required defaultValue={CATEGORIAS[0]}
          className="w-full mb-5 border border-black/20 bg-transparent px-3 py-2 outline-none focus:border-ouro"
        >
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>
          ))}
        </select>

        <label className="block text-[11px] uppercase tracking-[0.18em] mb-1">Data do ensaio</label>
        <InputData name="data_ensaio" className="mb-5 w-full" />

        <label className="block text-[11px] uppercase tracking-[0.18em] mb-1">Foto de capa</label>
        {capa ? (
          <div className="relative mb-7 group">
            <img src={capa.url} alt="" className="w-full h-40 object-cover border border-black/15" />
            <button
              type="button"
              onClick={abrirPicker}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition text-white text-[11px] uppercase tracking-[0.2em]"
            >
              Trocar foto
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={abrirPicker}
            className="w-full mb-7 flex items-center justify-between gap-3 border border-black/20 px-3 py-2 hover:border-ouro text-left"
          >
            <span className="text-sm text-black/45">Escolher da biblioteca…</span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-ouro shrink-0">buscar</span>
          </button>
        )}

        <div className="flex gap-3">
          <button
            type="submit" disabled={ocupado}
            className="flex-1 py-3 bg-tinta text-white text-[11px] uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {ocupado ? 'Criando…' : 'Criar ensaio'}
          </button>
          <button
            type="button" onClick={onFechar} disabled={ocupado}
            className="px-5 py-3 border border-black/20 text-[11px] uppercase tracking-[0.2em] hover:border-ouro disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Painel ----------
export default function Dashboard(
  {
    email, slots, textos, ensaios, fotosPorEnsaio, galeria, biblioteca, usoBiblioteca,
    gavetas, pastas,
  }: Props,
) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [ocupado, setOcupado] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [salvouTextos, setSalvouTextos] = useState(false);
  const [confirmacao, setConfirmacao] = useState<{ mensagem: string; onConfirmar: () => void } | null>(null);

  function confirmar(mensagem: string, onConfirmar: () => void) {
    setConfirmacao({ mensagem, onConfirmar });
  }

  // Biblioteca: filtros e paginacao sao estado local, sem ida ao servidor.
  const [filtroCat, setFiltroCat] = useState<FiltroCategoria>('todas');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [modoNav, setModoNav] = useState<'interno' | 'nativo'>('interno');
  const [visiveis, setVisiveis] = useState(BIBLIOTECA_POR_PAGINA);
  const [editando, setEditando] = useState<BibliotecaFoto | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [catLote, setCatLote] = useState<string>('familia');
  // Navegacao: categoria -> pastas da categoria -> fotos da pasta.
  const [pastaAberta, setPastaAberta] = useState<string | null>(null);
  const [criandoPasta, setCriandoPasta] = useState(false);
  const [nomePasta, setNomePasta] = useState('');
  const [avisoEnsaio, setAvisoEnsaio] = useState('');
  const [modalSelecionarFotos, setModalSelecionarFotos] = useState(false);
  const [ensaioAdicionandoFotos, setEnsaioAdicionandoFotos] = useState<string | null>(null);
  const [modalGaleria, setModalGaleria] = useState(false);
  const [slotEditando, setSlotEditando] = useState<SlotKey | null>(null);


  const [bibliotecaExpandida, setBibliotecaExpandida] = useState(false);
  const algumModalAberto = !!(editando || modal || confirmacao || modalSelecionarFotos || modalGaleria || slotEditando || ensaioAdicionandoFotos);
  useEffect(() => {
    document.body.style.overflow = algumModalAberto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [algumModalAberto]);

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function excluirSelecionados() {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    confirmar(
      `Deletar ${ids.length} foto(s) selecionada(s)? Elas serão removidas da biblioteca, galeria e ensaios permanentemente.`,
      async () => {
        const ok = await rodar(() => deleteBibliotecaLote(ids));
        if (ok) setSelecionados(new Set());
      },
    );
  }

  async function aplicarCatLote() {
    const ids = Array.from(selecionados);
    const ok = await rodar(() => updateBibliotecaLote(ids, catLote));
    if (ok) setSelecionados(new Set());
  }

  async function moverSelecionados(colecao: string) {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    const ok = await rodar(() => moverParaGaveta(ids, colecao));
    if (ok) setSelecionados(new Set());
  }

  /** Abre/fecha uma pasta. A pasta recem-criada ainda nao tem fotos: existe so aqui. */
  function abrirPasta(nome: string | null) {
    setPastaAberta(nome);
    setVisiveis(BIBLIOTECA_POR_PAGINA);
    setSelecionados(new Set());
    setCriandoPasta(false);
    setNomePasta('');
  }

  async function confirmarNovaPasta() {
    const nome = nomePasta.trim();
    if (!nome || filtroCat === 'todas') return;
    await rodar(() => criarPasta(nome, filtroCat));
    abrirPasta(nome);
  }

  function excluirPasta(nome: string) {
    const ids = biblioteca.filter((f) => f.colecao === nome).map((f) => f.id);
    confirmar(
      `Excluir a pasta "${nome}"? As ${ids.length} foto(s) continuam na biblioteca, apenas saem da pasta.`,
      async () => {
        if (ids.length > 0) await rodar(() => moverParaGaveta(ids, ''));
        if (filtroCat !== 'todas') await rodar(() => deletarPasta(nome, filtroCat));
        abrirPasta(null);
      },
    );
  }

  /** Abre o modal de selecao de fotos da biblioteca para adicionar a pasta. */
  function adicionarFotosNaPasta() {
    if (!pastaAberta || filtroCat === 'todas') return;
    setModalSelecionarFotos(true);
  }

  /** Confirma a selecao do modal — move as fotos para a pasta aberta. */
  async function confirmarAdicaoNaPasta(ids: string[]) {
    setModalSelecionarFotos(false);
    if (ids.length === 0 || !pastaAberta) return;
    await rodar(() => moverParaGaveta(ids, pastaAberta));
  }

  function promoverGaveta(nome: string) {
    confirmar(`Criar um ensaio a partir da pasta "${nome}"?`, async () => {
    const r = await rodar(() => criarEnsaioDeGaveta(nome));
    if (!r) return;
    setAvisoEnsaio(`Ensaio "${nome}" criado!`);
    setTimeout(() => setAvisoEnsaio(''), 6000);
    // Espera o refresh dos dados antes de rolar ate a secao.
    setTimeout(
      () => document.getElementById('secao-ensaios')?.scrollIntoView({ behavior: 'smooth' }),
      250,
    );
    });
  }

  const trabalhando = ocupado || pendente;
  const ensaiosNaHome = ensaios.filter((e) => e.na_home).length;
  const galeriaNaHome = galeria.filter((f) => f.na_home).length;

  const ondeEsta = (foto: BibliotecaFoto) => usoBiblioteca[foto.public_id] ?? [];
  const bibliotecaEmUso = biblioteca.filter((f) => ondeEsta(f).length > 0).length;
  /** Pastas da categoria em foco — inclui pastas vazias salvas no banco. */
  const pastasDaCategoria: Gaveta[] = (() => {
    if (filtroCat === 'todas') return [];
    // Contagem de fotos por pasta
    const contagem = new Map<string, number>();
    for (const f of biblioteca) {
      if (f.categoria !== filtroCat || !f.colecao) continue;
      contagem.set(f.colecao, (contagem.get(f.colecao) ?? 0) + 1);
    }
    // Pastas persistidas no banco (podem estar vazias)
    const nomesDoBanco = new Set(
      pastas.filter((p) => p.categoria === filtroCat).map((p) => p.nome),
    );
    // Une as duas fontes
    const todos = new Set([...contagem.keys(), ...nomesDoBanco]);
    return Array.from(todos, (nome) => ({ nome, total: contagem.get(nome) ?? 0 }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  })();

  /** Pastas oferecidas no select da barra de selecao. */
  const pastasDisponiveis: Gaveta[] = filtroCat === 'todas' ? gavetas : pastasDaCategoria;

  /** Fotos disponíveis para adicionar à pasta aberta (mesma categoria, sem pasta). */
  const fotosParaAdicionar = pastaAberta !== null && filtroCat !== 'todas'
    ? biblioteca.filter((f) => f.categoria === filtroCat && !f.colecao)
    : [];

  const bibliotecaFiltrada = biblioteca.filter((f) => {
    if (pastaAberta !== null) {
      // Tela 2: so as fotos desta pasta.
      if (f.categoria !== filtroCat || f.colecao !== pastaAberta) return false;
    } else if (filtroCat !== 'todas') {
      // Tela 1: as fotos da categoria que estao soltas — as das pastas ficam nos cards.
      if (f.categoria !== filtroCat || f.colecao) return false;
    }
    if (filtroStatus === 'em-uso') return ondeEsta(f).length > 0;
    if (filtroStatus === 'disponivel') return ondeEsta(f).length === 0;
    return true;
  });
  const bibliotecaVisivel = bibliotecaFiltrada.slice(0, visiveis);

  /** Executa uma action, mostra o erro se houver e recarrega os dados do servidor. */
  async function rodar(acao: () => Promise<Resultado>) {
    setOcupado(true);
    try {
      const r = await acao();
      if (!r.ok) alert(r.erro ?? 'Não foi possível concluir a operação.');
      return r.ok;
    } catch (e) {
      // Erros lancados antes da action rodar (ex.: limite de corpo) chegam aqui.
      const msg = e instanceof Error ? e.message : String(e);
      alert('Não foi possível concluir a operação.\n\n' + msg);
      return false;
    } finally {
      setOcupado(false);
      startTransition(() => router.refresh());
    }
  }

  async function sair() {
    await createClient().auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  /** Arquivos so chegam na server action dentro de um FormData. */
  function comArquivos(files: File[], campo = 'files') {
    const fd = new FormData();
    files.forEach((f) => fd.append(campo, f));
    return fd;
  }

  async function trocarSlot(chave: SlotKey) {
    if (modoNav === 'nativo') {
      const [file] = await escolherArquivos(false);
      if (!file) return;
      await rodar(() => updateSlot(chave, comArquivos([file], 'file')));
    } else {
      setSlotEditando(chave);
    }
  }

  async function confirmarFotosEnsaio(ids: string[]) {
    const ensaioId = ensaioAdicionandoFotos;
    setEnsaioAdicionandoFotos(null);
    if (!ids.length || !ensaioId) return;
    const fotos = biblioteca.filter((f) => ids.includes(f.id)).map((f) => ({ url: f.url, public_id: f.public_id }));
    if (!fotos.length) return;
    await rodar(() => adicionarBibliotecaEnsaio(ensaioId, fotos));
  }

  async function confirmarSlot(ids: string[]) {
    const id = ids[0];
    if (!id || !slotEditando) { setSlotEditando(null); return; }
    const foto = biblioteca.find((f) => f.id === id);
    if (!foto) { setSlotEditando(null); return; }
    await rodar(() => updateSlotFromBiblioteca(slotEditando, foto.url, foto.public_id));
    setSlotEditando(null);
  }

  async function salvarTextos(fd: FormData) {
    const ok = await rodar(() => updateTextos(fd));
    if (ok) {
      setSalvouTextos(true);
      setTimeout(() => setSalvouTextos(false), 2500);
    }
  }

  async function novoEnsaio(fd: FormData) {
    const ok = await rodar(() => createEnsaio(fd));
    if (ok) setModal(false);
  }

  async function addFotosEnsaio(ensaioId: string) {
    if (modoNav === 'nativo') {
      const files = await escolherArquivos(true);
      if (!files.length) return;
      await rodar(() => uploadEnsaioFotos(ensaioId, comArquivos(files)));
    } else {
      setEnsaioAdicionandoFotos(ensaioId);
    }
  }

  async function addFotosGaleria() {
    if (modoNav === 'nativo') {
      const files = await escolherArquivos(true);
      if (!files.length) return;
      await rodar(() => uploadGaleria(comArquivos(files)));
    } else {
      setModalGaleria(true);
    }
  }

  async function confirmarAdicionarGaleria(ids: string[]) {
    setModalGaleria(false);
    if (ids.length === 0) return;
    await rodar(() => adicionarBibliotecaGaleria(ids));
  }

  async function uploadEmLote() {
    const files = await escolherArquivos(true);
    if (!files.length) return;
    setVisiveis(BIBLIOTECA_POR_PAGINA);
    await rodar(() => uploadBiblioteca(comArquivos(files)));
  }

  async function salvarFotoBiblioteca(fd: FormData) {
    if (!editando) return;
    const ok = await rodar(() => updateBibliotecaFoto(editando.id, fd));
    if (ok) setEditando(null);
  }

  function trocarFiltroCat(cat: FiltroCategoria) {
    setFiltroCat(cat);
    setVisiveis(BIBLIOTECA_POR_PAGINA);
    setSelecionados(new Set());
    setPastaAberta(null);
    setCriandoPasta(false);
    setNomePasta('');
  }

  function trocarFiltroStatus(status: FiltroStatus) {
    setFiltroStatus(status);
    setVisiveis(BIBLIOTECA_POR_PAGINA);
  }

  function mover<T extends { id: string }>(
    tabela: 'ensaios' | 'ensaio_fotos' | 'galeria', lista: T[], i: number, d: number,
  ) {
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    const ids = lista.map((x) => x.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void rodar(() => reordenar(tabela, ids));
  }

  return (
    <main className="min-h-screen bg-papel text-tinta">
      {/* Barra de progresso global */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          height: 2,
          background: 'linear-gradient(90deg, var(--ouro) 0%, #e8d9b5 60%, var(--ouro) 100%)',
          backgroundSize: '200% 100%',
          opacity: trabalhando ? 1 : 0,
          transition: trabalhando ? 'opacity .15s' : 'opacity .4s .2s',
          animation: trabalhando ? 'adminProgress 1.4s ease-in-out infinite' : 'none',
          pointerEvents: 'none',
        }}
      />
      {/* Overlay de carregamento */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(232,228,221,0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          opacity: trabalhando ? 1 : 0,
          pointerEvents: trabalhando ? 'auto' : 'none',
          transition: trabalhando ? 'opacity .15s' : 'opacity .35s .1s',
        }}
      >
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ animation: 'adminSpin 1.1s linear infinite' }}>
          <circle cx="19" cy="19" r="16" stroke="#d4c4a0" strokeWidth="1.5"/>
          <path d="M19 3 A16 16 0 0 1 35 19" stroke="#6d675f" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--tinta)', opacity: .5 }}>
          processando
        </span>
      </div>

      <style>{`
        @keyframes adminProgress {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes adminSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-6 md:px-10 py-5 bg-papel/95 backdrop-blur border-b border-black/10">
        <div className="font-serif text-xl tracking-[0.18em]">{MARCA} · admin</div>
        <div className="flex items-center gap-5 text-xs">
          <a href="/" target="_blank" className="uppercase tracking-[0.18em] hover:text-ouro">
            Ver site ↗
          </a>
          <span className="text-black/50 hidden sm:inline">{email}</span>
          <button onClick={sair} className="uppercase tracking-[0.18em] hover:text-ouro">Sair</button>
        </div>
      </header>

      <div
        className="max-w-5xl mx-auto px-6 md:px-10 pb-24 transition-opacity"
        style={{ opacity: trabalhando ? 0.55 : 1, pointerEvents: trabalhando ? 'none' : 'auto' }}
      >
        {/* ---------- BIBLIOTECA ---------- */}
        <Secao
          numero="00"
          titulo="Biblioteca"
          ajuda={modoNav === 'interno'
            ? 'Acervo central de fotos. Escolha uma categoria para ver e criar pastas dentro dela, e depois atribua as fotos a cada seção do site.'
            : 'Modo explorador nativo ativo — as fotos são escolhidas direto do seu computador. A biblioteca interna está indisponível neste modo.'}
        >
          {/* ——— painel unificado ——— */}
          <div className="border border-black/12 bg-white">

            {/* cabeçalho: stats + upload + toggle */}
            <div className="flex flex-wrap items-center gap-0 border-b border-black/10">
              <button
                onClick={() => modoNav === 'interno' && setBibliotecaExpandida((v) => !v)}
                className={`flex items-center gap-3 px-5 py-4 border-r border-black/10 transition-colors ${modoNav === 'interno' ? 'hover:bg-black/[0.02]' : 'opacity-30 cursor-not-allowed'}`}
                title={modoNav === 'nativo' ? 'Indisponível no modo nativo' : bibliotecaExpandida ? 'Minimizar biblioteca' : 'Expandir biblioteca'}
              >
                <svg
                  viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"
                  className={`w-3 h-3 text-black/40 transition-transform ${bibliotecaExpandida ? 'rotate-180' : ''}`}
                >
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {[
                { valor: biblioteca.length, rotulo: 'Total' },
                { valor: bibliotecaEmUso, rotulo: 'Em uso' },
                { valor: biblioteca.length - bibliotecaEmUso, rotulo: 'Disponíveis' },
              ].map(({ valor, rotulo }) => (
                <button
                  key={rotulo}
                  onClick={() => modoNav === 'interno' && setBibliotecaExpandida((v) => !v)}
                  className={`flex flex-col items-center justify-center px-8 py-4 border-r border-black/10 min-w-[90px] transition-colors ${modoNav === 'interno' ? 'hover:bg-black/[0.02]' : 'opacity-40'}`}
                >
                  <span className="font-serif text-2xl font-light">{valor}</span>
                  <span className="text-[9px] uppercase tracking-[0.22em] text-black/40 mt-0.5">{rotulo}</span>
                </button>
              ))}
              {/* toggle modo */}
              <div className="ml-auto flex items-stretch border-l border-black/10">
                <button
                  onClick={() => setModoNav('interno')}
                  className={`px-4 py-4 text-[10px] uppercase tracking-[0.16em] border-r border-black/10 transition-colors ${modoNav === 'interno' ? 'bg-tinta text-white' : 'text-black/45 hover:text-black'}`}
                >
                  Interno
                </button>
                <button
                  onClick={() => setModoNav('nativo')}
                  className={`px-4 py-4 text-[10px] uppercase tracking-[0.16em] transition-colors ${modoNav === 'nativo' ? 'bg-tinta text-white' : 'text-black/45 hover:text-black'}`}
                >
                  Nativo
                </button>
              </div>

              {modoNav === 'interno' && (
                <button
                  onClick={() => void uploadEmLote()} disabled={trabalhando}
                  className="px-6 py-4 bg-tinta text-white text-[11px] uppercase tracking-[0.2em] hover:bg-black disabled:opacity-50 border-l border-black/10"
                >
                  + Upload em lote
                </button>
              )}
            </div>

            {modoNav === 'nativo' && (
              <div className="px-5 py-4 text-[11px] uppercase tracking-[0.16em] text-black/35">
                Indisponível no modo explorador nativo.
              </div>
            )}

            {modoNav === 'interno' && !bibliotecaExpandida && biblioteca.length === 0 && (
              <div className="px-5 py-4 text-[11px] uppercase tracking-[0.16em] text-black/35">
                Nenhuma foto — clique para expandir e fazer upload.
              </div>
            )}

            {modoNav === 'interno' && bibliotecaExpandida && (<>
            {avisoEnsaio && (
              <div className="px-5 py-3 border-b border-green-700/30 bg-green-50 text-sm text-green-800">
                {avisoEnsaio} Role até a seção 03 para ajustar categoria e data.
              </div>
            )}

            {/* filtros */}
            <div className="px-5 py-4 border-b border-black/10 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-black/35 w-16 shrink-0">Categoria</span>
                <Pill ativo={filtroCat === 'todas'} onClick={() => trocarFiltroCat('todas')}>Todas</Pill>
                {CATEGORIAS_BIBLIOTECA.map((c) => (
                  <Pill key={c} ativo={filtroCat === c} onClick={() => trocarFiltroCat(c)}>
                    {CATEGORIA_BIBLIOTECA_LABEL[c]}
                  </Pill>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-black/35 w-16 shrink-0">Status</span>
                <Pill ativo={filtroStatus === 'todos'} onClick={() => trocarFiltroStatus('todos')}>Todas</Pill>
                <Pill ativo={filtroStatus === 'em-uso'} onClick={() => trocarFiltroStatus('em-uso')}>Em uso</Pill>
                <Pill ativo={filtroStatus === 'disponivel'} onClick={() => trocarFiltroStatus('disponivel')}>Disponível</Pill>
              </div>
            </div>

            {/* TELA 1 — pastas da categoria */}
            {filtroCat !== 'todas' && pastaAberta === null && (
              <div className="px-5 py-4 border-b border-black/10">
                <div className="text-[10px] uppercase tracking-[0.2em] text-black/35 mb-3">Pastas</div>
                <div className="flex flex-wrap gap-3">
                  {pastasDaCategoria.map((pasta) => (
                    <div key={pasta.nome} className="relative group w-28">
                      {/* botão excluir */}
                      <button
                        type="button"
                        onClick={() => void excluirPasta(pasta.nome)}
                        disabled={trabalhando}
                        aria-label={`Excluir pasta ${pasta.nome}`}
                        className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-white border border-black/15 text-[10px] text-black/35 hover:text-red-700 hover:border-red-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"
                      >
                        ✕
                      </button>
                      {/* pasta clicável */}
                      <button
                        type="button"
                        onClick={() => abrirPasta(pasta.nome)}
                        className="w-full flex flex-col items-center gap-1.5 px-2 py-3 border border-black/12 hover:border-ouro bg-white transition group-hover:bg-ouro/[0.03]"
                      >
                        <svg viewBox="0 0 96 80" xmlns="http://www.w3.org/2000/svg" className="w-10 h-8 shrink-0">
                          <rect x="4" y="18" width="88" height="58" rx="5" fill="#d4c4a0" opacity="0.35" />
                          <rect x="0" y="20" width="96" height="56" rx="5" fill="#e8d9b8" />
                          <path d="M0 25 L96 25 L96 20 Q96 14 90 14 L42 14 Q40 14 38 18 L36 22 L6 22 Q0 22 0 25Z" fill="#d4c49a" />
                          <rect x="12" y="36" width="45" height="3" rx="1.5" fill="#b8a882" opacity="0.6" />
                          <rect x="12" y="44" width="32" height="3" rx="1.5" fill="#b8a882" opacity="0.4" />
                        </svg>
                        <span className="text-[11px] text-center leading-tight text-black/70 font-medium max-w-full truncate px-1 w-full">{pasta.nome}</span>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-black/40">
                          {pasta.total} {pasta.total === 1 ? 'foto' : 'fotos'}
                        </span>
                      </button>
                    </div>
                  ))}

                  {criandoPasta ? (
                    <div className="flex items-center gap-2 px-4 py-3 border border-ouro">
                      <input
                        autoFocus
                        value={nomePasta}
                        onChange={(e) => setNomePasta(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); confirmarNovaPasta(); }
                          if (e.key === 'Escape') { setCriandoPasta(false); setNomePasta(''); }
                        }}
                        placeholder="Nome da pasta…"
                        maxLength={60}
                        className="text-sm bg-transparent border-b border-black/20 outline-none focus:border-ouro w-44"
                      />
                      <button
                        type="button" onClick={confirmarNovaPasta} disabled={!nomePasta.trim()}
                        className="text-[10px] uppercase tracking-[0.16em] text-ouro disabled:opacity-40"
                      >
                        Criar
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCriandoPasta(false); setNomePasta(''); }}
                        className="text-[10px] uppercase tracking-[0.16em] text-black/35 hover:text-black/60"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCriandoPasta(true)}
                      className="px-4 py-3 border border-dashed border-black/25 text-[11px] uppercase tracking-[0.16em] text-black/50 hover:border-ouro hover:text-ouro transition"
                    >
                      + Nova pasta
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TELA 2 — dentro da pasta */}
            {pastaAberta !== null && filtroCat !== 'todas' && (
              <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-black/10 bg-black/[0.02]">
                <button
                  type="button"
                  onClick={() => abrirPasta(null)}
                  className="text-[11px] uppercase tracking-[0.16em] text-black/55 hover:text-ouro"
                >
                  ← {CATEGORIA_BIBLIOTECA_LABEL[filtroCat]}
                </button>
                <span className="text-black/20">/</span>
                <span className="flex items-center gap-1.5 text-sm">
                  <svg viewBox="0 0 96 80" xmlns="http://www.w3.org/2000/svg" className="w-5 h-4 shrink-0">
                    <rect x="0" y="20" width="96" height="56" rx="5" fill="#e8d9b8" />
                    <path d="M0 25 L96 25 L96 20 Q96 14 90 14 L42 14 Q40 14 38 18 L36 22 L6 22 Q0 22 0 25Z" fill="#d4c49a" />
                  </svg>
                  {pastaAberta}
                </span>
                <div className="ml-auto flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => void adicionarFotosNaPasta()}
                    disabled={trabalhando}
                    className="px-4 py-2 bg-tinta text-white text-[11px] uppercase tracking-[0.16em] disabled:opacity-50"
                  >
                    + Adicionar fotos
                  </button>
                  <button
                    type="button"
                    onClick={() => void excluirPasta(pastaAberta)}
                    disabled={trabalhando}
                    className="text-[11px] uppercase tracking-[0.16em] text-red-700/70 hover:text-red-700 disabled:opacity-40"
                  >
                    Excluir pasta
                  </button>
                </div>
              </div>
            )}

            {/* avisos e mensagens */}
            <div className="px-5">
              {(() => {
                const semCat = biblioteca.filter((f) => !f.categoria).length;
                return semCat > 0 ? (
                  <div className="flex items-center gap-3 py-3 border-b border-ouro/30 text-sm text-black/70">
                    <span className="text-ouro">⚠</span>
                    <span>
                      <strong className="font-medium">{semCat} {semCat === 1 ? 'foto sem categoria' : 'fotos sem categoria'}</strong>
                      {' '}— clique em <span className="text-ouro font-medium">Categorizar →</span> em cada uma.
                    </span>
                  </div>
                ) : null;
              })()}

              {biblioteca.length === 0 && (
                <p className="text-black/50 py-6">Nenhuma foto na biblioteca ainda. Use o upload em lote para começar.</p>
              )}
              {biblioteca.length > 0 && bibliotecaFiltrada.length === 0 && (
                <p className="text-black/50 py-6">
                  {pastaAberta !== null
                    ? 'Pasta vazia — use "+ Adicionar fotos" para enviar as primeiras.'
                    : 'Nenhuma foto com esses filtros.'}
                </p>
              )}
            </div>

            {/* barra de seleção */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-tinta text-white border-t border-black/20">
            <span className="text-[11px] uppercase tracking-[0.16em] min-w-[140px]">
              {selecionados.size} {selecionados.size === 1 ? 'foto selecionada' : 'fotos selecionadas'}
            </span>
            {selecionados.size > 0 && (<>
              <select
                value={catLote}
                onChange={(e) => setCatLote(e.target.value)}
                className="bg-white/15 text-white text-[11px] uppercase tracking-[0.12em] px-2 py-1 border border-white/30 outline-none"
              >
                {CATEGORIAS_BIBLIOTECA.map((c) => (
                  <option key={c} value={c} className="text-black">{CATEGORIA_BIBLIOTECA_LABEL[c]}</option>
                ))}
              </select>
              <button
                onClick={() => void aplicarCatLote()} disabled={trabalhando}
                className="px-4 py-1.5 bg-ouro text-white text-[11px] uppercase tracking-[0.16em] hover:opacity-90 disabled:opacity-50"
              >
                Aplicar categoria
              </button>

              <span className="w-px h-6 bg-white/20" />

              {pastaAberta !== null ? (
                <button
                  onClick={() => void moverSelecionados('')} disabled={trabalhando}
                  className="px-4 py-1.5 bg-white/15 border border-white/30 text-[11px] uppercase tracking-[0.16em] hover:border-ouro disabled:opacity-40"
                >
                  Remover da pasta
                </button>
              ) : (
                <select
                  value=""
                  onChange={(e) => { if (e.target.value) void moverSelecionados(e.target.value); }}
                  disabled={trabalhando || pastasDisponiveis.length === 0}
                  className="bg-white/15 text-white text-[11px] uppercase tracking-[0.12em] px-2 py-1 border border-white/30 outline-none disabled:opacity-40"
                >
                  <option value="" className="text-black">
                    {pastasDisponiveis.length === 0 ? 'Nenhuma pasta ainda' : 'Mover para pasta…'}
                  </option>
                  {pastasDisponiveis.map((g) => (
                    <option key={g.nome} value={g.nome} className="text-black">{g.nome}</option>
                  ))}
                </select>
              )}
            </>)}
            <div className="ml-auto flex gap-4">
              <button
                onClick={() => setSelecionados(new Set(bibliotecaFiltrada.map((f) => f.id)))}
                className="text-[11px] uppercase tracking-[0.16em] text-white/60 hover:text-white"
              >
                Selecionar todas
              </button>
              {selecionados.size > 0 && (<>
                <button
                  onClick={() => setSelecionados(new Set())}
                  className="text-[11px] uppercase tracking-[0.16em] text-white/60 hover:text-white"
                >
                  Limpar seleção
                </button>
                <button
                  onClick={excluirSelecionados}
                  disabled={trabalhando}
                  title="Deletar fotos selecionadas"
                  className="ml-1 flex items-center gap-1.5 px-3 py-1 border border-red-400/50 text-red-300 text-[11px] uppercase tracking-[0.14em] hover:bg-red-700/30 disabled:opacity-40"
                >
                  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0">
                    <path d="M3 5h14M8 5V3h4v2M5 5l1 12h8l1-12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 9v5M12 9v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Deletar
                </button>
              </>)}
            </div>
            </div>

            {/* grade de fotos */}
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {bibliotecaVisivel.map((foto) => (
                  <CardBiblioteca
                    key={foto.id}
                    foto={foto}
                    onde={ondeEsta(foto)}
                    ocupado={trabalhando}
                    selecionado={selecionados.has(foto.id)}
                    onSelecionar={() => toggleSelecionado(foto.id)}
                    onEditar={() => setEditando(foto)}
                  />
                ))}
              </div>

              {bibliotecaVisivel.length < bibliotecaFiltrada.length && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setVisiveis((v) => v + BIBLIOTECA_POR_PAGINA)}
                    className="px-6 py-3 border border-black/25 text-[11px] uppercase tracking-[0.2em] hover:border-ouro"
                  >
                    Carregar mais ({bibliotecaFiltrada.length - bibliotecaVisivel.length} restantes)
                  </button>
                </div>
              )}
            </div>
            </>)}{/* fim bibliotecaExpandida */}

          </div>{/* fim painel unificado */}
        </Secao>

        {/* ---------- HERO ---------- */}
        <Secao
          numero="01"
          titulo="Hero"
          ajuda="Os 3 blocos que se alternam no topo do site a cada 5 segundos, cada um com duas imagens lado a lado. Clique em qualquer uma para enviar outra foto."
        >
          <div className="flex flex-col gap-8">
            {HERO_PARES.map(([esq, dir], i) => (
              <div key={i}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-ouro">
                    Bloco {i + 1}
                  </span>
                  <span className="flex-1 h-px bg-black/10" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <SlotFoto
                    chave={esq} rotulo="Imagem da esquerda" slots={slots}
                    ocupado={trabalhando} onTrocar={trocarSlot}
                  />
                  <SlotFoto
                    chave={dir} rotulo="Imagem da direita" slots={slots}
                    ocupado={trabalhando} onTrocar={trocarSlot}
                  />
                </div>
              </div>
            ))}
          </div>
        </Secao>

        {/* ---------- SOBRE MIM ---------- */}
        <Secao
          numero="02"
          titulo="Sobre mim"
          ajuda="O retrato, o título e o texto de apresentação. O nome do estúdio é fixo no template."
        >
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-start">
            <SlotFoto chave="sobre_foto" rotulo="Retrato" slots={slots} ocupado={trabalhando} onTrocar={trocarSlot} />

            <form
              onSubmit={(e) => { e.preventDefault(); void salvarTextos(new FormData(e.currentTarget)); }}
            >
              <label className="block text-[11px] uppercase tracking-[0.18em] mb-1">Título</label>
              <input
                name="sobre_titulo" defaultValue={textos.sobre_titulo}
                className="w-full mb-5 border border-black/20 bg-transparent px-3 py-2 outline-none focus:border-ouro font-serif text-lg tracking-wide"
              />

              <label className="block text-[11px] uppercase tracking-[0.18em] mb-1">Bio</label>
              <textarea
                name="sobre_bio" rows={7} defaultValue={textos.sobre_bio}
                className="w-full mb-2 border border-black/20 bg-transparent px-3 py-2 outline-none focus:border-ouro resize-y leading-relaxed"
              />
              <p className="text-xs text-black/45 mb-5">
                Deixe uma linha em branco entre os parágrafos.
              </p>

              <div className="flex items-center gap-4">
                <button
                  type="submit" disabled={trabalhando}
                  className="px-6 py-3 bg-tinta text-white text-[11px] uppercase tracking-[0.2em] disabled:opacity-50"
                >
                  Salvar textos
                </button>
                {salvouTextos && (
                  <span className="text-[11px] uppercase tracking-[0.18em] text-ouro">salvo</span>
                )}
              </div>
            </form>
          </div>
        </Secao>

        {/* ---------- ENSAIOS ---------- */}
        <Secao
          id="secao-ensaios"
          numero="03"
          titulo="Ensaios"
          ajuda={`Cada ensaio vira um card no site, e as fotos internas abrem no lightbox. No máximo ${MAX_HOME_ENSAIOS} ensaios aparecem na home — hoje são ${ensaiosNaHome}.`}
        >
          <button
            onClick={() => setModal(true)} disabled={trabalhando}
            className="mb-7 px-5 py-3 bg-tinta text-white text-[11px] uppercase tracking-[0.2em] disabled:opacity-50"
          >
            + Novo ensaio
          </button>

          {ensaios.length === 0 && (
            <p className="text-black/50">Nenhum ensaio cadastrado ainda.</p>
          )}

          <div className="flex flex-col gap-4">
            {ensaios.map((ensaio, i) => {
              const fotos = fotosPorEnsaio[ensaio.id] ?? [];
              const aberto = expandido === ensaio.id;

              return (
                <article key={ensaio.id} className="border border-black/10 bg-white">
                  <div className="flex items-stretch gap-4">
                    <button
                      type="button"
                      onClick={() => setExpandido(aberto ? null : ensaio.id)}
                      className="flex items-center gap-4 flex-1 text-left p-3"
                      aria-expanded={aberto}
                    >
                      {ensaio.cover_url ? (
                        <img src={ensaio.cover_url} alt="" className="w-24 h-24 object-cover shrink-0" />
                      ) : (
                        <span className="w-24 h-24 shrink-0 bg-papel border border-black/10 flex items-center justify-center text-[10px] uppercase tracking-[0.14em] text-black/40">
                          sem capa
                        </span>
                      )}

                      <div className="min-w-0">
                        <div className="font-serif text-xl tracking-[0.06em] truncate">
                          {ensaio.titulo}
                        </div>
                        <div className="mt-1 text-xs text-black/55">
                          {CATEGORIA_LABEL[ensaio.categoria]}
                          {ensaio.data_ensaio && ` · ${dataCurta(ensaio.data_ensaio)}`}
                          {` · ${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'}`}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Etiqueta ativo={ensaio.na_home} />
                          <span className="text-[11px] text-black/40 uppercase tracking-[0.14em]">
                            {aberto ? 'fechar' : 'abrir fotos'}
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="flex flex-col items-end justify-between gap-2 p-3 text-xs border-l border-black/10">
                      <Setas i={i} total={ensaios.length} onMover={(d) => mover('ensaios', ensaios, i, d)} />
                      <button
                        onClick={() => void rodar(() => toggleNaHome('ensaios', ensaio.id))}
                        className="uppercase tracking-[0.14em] hover:text-ouro whitespace-nowrap"
                      >
                        {ensaio.na_home ? 'tirar da home' : 'pôr na home'}
                      </button>
                      <button
                        onClick={() => confirmar(`Deletar "${ensaio.titulo}" e todas as suas fotos?`, () => {
                          void rodar(() => deleteEnsaio(ensaio.id));
                        })}
                        className="uppercase tracking-[0.14em] text-black/50 hover:text-red-700"
                      >
                        deletar
                      </button>
                    </div>
                  </div>

                  {aberto && (
                    <div className="border-t border-black/10 p-4 bg-papel/40">
                      <button
                        onClick={() => void addFotosEnsaio(ensaio.id)} disabled={trabalhando}
                        className="mb-4 px-4 py-2 border border-black/25 text-[11px] uppercase tracking-[0.18em] hover:border-ouro disabled:opacity-50"
                      >
                        + Adicionar fotos
                      </button>

                      {fotos.length === 0 ? (
                        <p className="text-sm text-black/50">Esse ensaio ainda não tem fotos internas.</p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {fotos.map((foto, j) => (
                            <figure key={foto.id} className="relative group border border-black/10 bg-white">
                              <img src={foto.url} alt="" className="w-full h-24 object-cover" />
                              <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between px-1.5 py-1 bg-black/55 text-white text-xs opacity-0 group-hover:opacity-100 transition">
                                <Setas
                                  i={j} total={fotos.length}
                                  onMover={(d) => mover('ensaio_fotos', fotos, j, d)}
                                />
                                <button
                                  onClick={() => confirmar('Deletar esta foto?', () => {
                                    void rodar(() => deleteEnsaioFoto(foto.id, foto.public_id));
                                  })}
                                  aria-label="Deletar" className="px-1 hover:text-red-400"
                                >
                                  ✕
                                </button>
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </Secao>

        {/* ---------- GALERIA ---------- */}
        <Secao
          numero="04"
          titulo="Galeria"
          ajuda={`O carrossel horizontal do site. As marcadas como "na home" abrem o carrossel (máx. ${MAX_HOME_GALERIA} — hoje são ${galeriaNaHome}); as demais entram quando o visitante clica em "ver mais".`}
        >
          <button
            onClick={() => void addFotosGaleria()} disabled={trabalhando}
            className="mb-7 px-5 py-3 bg-tinta text-white text-[11px] uppercase tracking-[0.2em] disabled:opacity-50"
          >
            + Adicionar fotos
          </button>

          {galeria.length === 0 && <p className="text-black/50">Nenhuma foto na galeria ainda.</p>}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {galeria.map((foto, i) => (
              <figure key={foto.id} className="border border-black/10 bg-white">
                <div className="relative group">
                  <img src={foto.url} alt="" className="w-full h-44 object-cover" />
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 py-1.5 bg-black/55 text-white opacity-0 group-hover:opacity-100 transition">
                    <Setas i={i} total={galeria.length} onMover={(d) => mover('galeria', galeria, i, d)} />
                    <button
                      onClick={() => confirmar('Deletar esta foto?', () => {
                        void rodar(() => deleteGaleriaFoto(foto.id, foto.public_id));
                      })}
                      aria-label="Deletar" className="px-1.5 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </figcaption>
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-2">
                  <Etiqueta ativo={foto.na_home} />
                  <button
                    onClick={() => void rodar(() => toggleNaHome('galeria', foto.id))}
                    className="text-[11px] uppercase tracking-[0.14em] hover:text-ouro"
                  >
                    {foto.na_home ? 'tirar' : 'pôr na home'}
                  </button>
                </div>
              </figure>
            ))}
          </div>
        </Secao>

        {/* ---------- CTA ---------- */}
        <Secao
          numero="05"
          titulo="CTA"
          ajuda="A faixa larga perto do rodapé. Troque o fundo e edite os textos que aparecem sobre a imagem."
        >
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-start">
            <SlotFoto chave="cta_bg" rotulo="Imagem de fundo" slots={slots} ocupado={trabalhando} onTrocar={trocarSlot} />

            <form
              onSubmit={(e) => { e.preventDefault(); void salvarTextos(new FormData(e.currentTarget)); }}
            >
              <label className="block text-[11px] uppercase tracking-[0.18em] mb-1">Título</label>
              <input
                name="cta_titulo" defaultValue={textos.cta_titulo}
                className="w-full mb-4 border border-black/20 bg-transparent px-3 py-2 outline-none focus:border-ouro font-serif text-lg tracking-wide"
              />

              <label className="block text-[11px] uppercase tracking-[0.18em] mb-1">Subtítulo</label>
              <input
                name="cta_sub" defaultValue={textos.cta_sub}
                className="w-full mb-4 border border-black/20 bg-transparent px-3 py-2 outline-none focus:border-ouro"
              />

              <label className="block text-[11px] uppercase tracking-[0.18em] mb-1">Texto do botão</label>
              <input
                name="cta_botao" defaultValue={textos.cta_botao}
                className="w-full mb-6 border border-black/20 bg-transparent px-3 py-2 outline-none focus:border-ouro"
              />

              <div className="flex items-center gap-4">
                <button
                  type="submit" disabled={trabalhando}
                  className="px-6 py-3 bg-tinta text-white text-[11px] uppercase tracking-[0.2em] disabled:opacity-50"
                >
                  Salvar textos
                </button>
                {salvouTextos && (
                  <span className="text-[11px] uppercase tracking-[0.18em] text-ouro">salvo</span>
                )}
              </div>
            </form>
          </div>
        </Secao>
      </div>

      {editando && (
        <ModalEditarFoto
          foto={editando}
          ocupado={trabalhando}
          onFechar={() => setEditando(null)}
          onSalvar={(fd) => void salvarFotoBiblioteca(fd)}
        />
      )}

      {modal && (
        <ModalNovoEnsaio
          ocupado={trabalhando}
          onFechar={() => setModal(false)}
          onCriar={(fd) => void novoEnsaio(fd)}
          biblioteca={biblioteca}
          pastas={pastas}
        />
      )}

      {confirmacao && (
        <ModalConfirmar
          mensagem={confirmacao.mensagem}
          onConfirmar={() => { confirmacao.onConfirmar(); setConfirmacao(null); }}
          onCancelar={() => setConfirmacao(null)}
        />
      )}

      {modalSelecionarFotos && filtroCat !== 'todas' && (
        <ModalSelecionarFotos
          biblioteca={fotosParaAdicionar}
          pastas={[]}
          fixarCategoria={filtroCat}
          labelConfirmar="Adicionar à pasta"
          onConfirmar={(ids) => void confirmarAdicaoNaPasta(ids)}
          onCancelar={() => setModalSelecionarFotos(false)}
        />
      )}

      {modalGaleria && (
        <ModalSelecionarFotos
          biblioteca={biblioteca}
          pastas={pastas}
          labelConfirmar="Adicionar à galeria"
          jaUsadas={new Set(galeria.map((f) => f.public_id))}
          onConfirmar={(ids) => void confirmarAdicionarGaleria(ids)}
          onCancelar={() => setModalGaleria(false)}
        />
      )}

      {ensaioAdicionandoFotos && (
        <ModalSelecionarFotos
          biblioteca={biblioteca}
          pastas={pastas}
          labelConfirmar="Adicionar ao ensaio"
          onConfirmar={(ids) => void confirmarFotosEnsaio(ids)}
          onCancelar={() => setEnsaioAdicionandoFotos(null)}
        />
      )}

      {slotEditando && (
        <ModalSelecionarFotos
          biblioteca={biblioteca}
          pastas={pastas}
          labelConfirmar="Usar esta foto"
          modoSingle
          onConfirmar={(ids) => void confirmarSlot(ids)}
          onCancelar={() => setSlotEditando(null)}
        />
      )}
    </main>
  );
}
