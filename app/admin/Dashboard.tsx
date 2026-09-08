'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  CATEGORIAS, CATEGORIA_LABEL, dataCurta, Ensaio, EnsaioFoto, GaleriaFoto, HERO_PARES,
  MARCA, MAX_HOME_ENSAIOS, MAX_HOME_GALERIA, SlotKey, SLOT_PLACEHOLDER, Slots, Textos,
} from '@/lib/data';
import type { Resultado } from './actions';
import {
  createEnsaio, deleteEnsaio, deleteEnsaioFoto, deleteGaleriaFoto, reordenar,
  toggleNaHome, updateSlot, updateTextos, uploadEnsaioFotos, uploadGaleria,
} from './actions';

type Props = {
  email: string;
  slots: Slots;
  textos: Textos;
  ensaios: Ensaio[];
  fotosPorEnsaio: Record<string, EnsaioFoto[]>;
  galeria: GaleriaFoto[];
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
  { onFechar, onCriar, ocupado }:
  { onFechar: () => void; onCriar: (fd: FormData) => void; ocupado: boolean },
) {
  const [nomeArquivo, setNomeArquivo] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-6"
      onClick={(e) => { if (e.target === e.currentTarget && !ocupado) onFechar(); }}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); onCriar(new FormData(e.currentTarget)); }}
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
        <label className="flex items-center justify-between gap-3 mb-7 border border-black/20 px-3 py-2 cursor-pointer hover:border-ouro">
          <span className="text-sm text-black/60 truncate">
            {nomeArquivo || 'Escolher imagem…'}
          </span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-ouro shrink-0">buscar</span>
          <input
            type="file" name="cover" accept="image/*" className="hidden"
            onChange={(e) => setNomeArquivo(e.target.files?.[0]?.name ?? '')}
          />
        </label>

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
  { email, slots, textos, ensaios, fotosPorEnsaio, galeria }: Props,
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

  const algumModalAberto = !!(modal || confirmacao);
  useEffect(() => {
    document.body.style.overflow = algumModalAberto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [algumModalAberto]);

  const trabalhando = ocupado || pendente;
  const ensaiosNaHome = ensaios.filter((e) => e.na_home).length;
  const galeriaNaHome = galeria.filter((f) => f.na_home).length;

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
    const [file] = await escolherArquivos(false);
    if (!file) return;
    await rodar(() => updateSlot(chave, comArquivos([file], 'file')));
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
    const files = await escolherArquivos(true);
    if (!files.length) return;
    await rodar(() => uploadEnsaioFotos(ensaioId, comArquivos(files)));
  }

  async function addFotosGaleria() {
    const files = await escolherArquivos(true);
    if (!files.length) return;
    await rodar(() => uploadGaleria(comArquivos(files)));
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


      {modal && (
        <ModalNovoEnsaio
          ocupado={trabalhando}
          onFechar={() => setModal(false)}
          onCriar={(fd) => void novoEnsaio(fd)}
        />
      )}

      {confirmacao && (
        <ModalConfirmar
          mensagem={confirmacao.mensagem}
          onConfirmar={() => { confirmacao.onConfirmar(); setConfirmacao(null); }}
          onCancelar={() => setConfirmacao(null)}
        />
      )}




    </main>
  );
}
