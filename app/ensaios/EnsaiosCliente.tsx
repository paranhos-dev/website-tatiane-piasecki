'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useLightbox } from '@/components/Lightbox';
import { CATEGORIA_BIBLIOTECA_LABEL, CATEGORIA_LABEL, CATEGORIAS_BIBLIOTECA, Ensaio, EnsaioFoto, FiltroCategoria, SLOT_PLACEHOLDER } from '@/lib/data';
import { CDN, cdnUrl } from '@/lib/imagens';

export default function EnsaiosCliente(
  { ensaios, fotosPorEnsaio, marca }:
  { ensaios: Ensaio[]; fotosPorEnsaio: Record<string, EnsaioFoto[]>; marca: string },
) {
  const { open } = useLightbox();
  const [filtro, setFiltro] = useState<FiltroCategoria>('todas');

  const visiveis = filtro === 'todas'
    ? ensaios
    : ensaios.filter((e) => e.categoria === filtro);

  return (
    <>
      {/* Nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px clamp(24px,6vw,110px)',
        background: 'var(--papel)', borderBottom: '1px solid rgba(20,17,15,.1)',
      }}>
        <a href="/" style={{ fontFamily: 'var(--serif)', fontSize: 22, letterSpacing: '.2em', textTransform: 'uppercase' }}>
          {marca}
        </a>
        <nav style={{ display: 'flex', gap: 32, fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase' }}>
          <a href="/#sobre">Sobre mim</a>
          <a href="/galeria">Galeria</a>
          <a href="/#contato">Contato</a>
        </nav>
      </header>

      <main style={{ padding: 'clamp(60px,8vw,110px) clamp(24px,6vw,110px)' }}>
        {/* Título */}
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div className="cabeca" style={{ marginBottom: 40 }}>
            <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 'clamp(28px,3.4vw,46px)', margin: 0 }}>
              Ensaios
            </h1>
            <span style={{ fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--ouro)' }}>
              {ensaios.length} {ensaios.length === 1 ? 'ensaio' : 'ensaios'}
            </span>
          </div>

          {/* Filtros de categoria */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 52 }}>
            {(['todas', ...CATEGORIAS_BIBLIOTECA] as FiltroCategoria[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setFiltro(cat)}
                style={{
                  padding: '6px 16px',
                  fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase',
                  border: `1px solid ${filtro === cat ? 'var(--tinta)' : 'rgba(20,17,15,.2)'}`,
                  background: filtro === cat ? 'var(--tinta)' : 'transparent',
                  color: filtro === cat ? '#fff' : 'rgba(20,17,15,.6)',
                  cursor: 'pointer', transition: 'all .2s',
                }}
              >
                {cat === 'todas' ? 'Todos' : CATEGORIA_BIBLIOTECA_LABEL[cat]}
              </button>
            ))}
          </div>

          {/* Grid */}
          {visiveis.length === 0 ? (
            <p style={{ color: 'rgba(20,17,15,.45)', fontSize: 14, letterSpacing: '.14em', textTransform: 'uppercase' }}>
              Nenhum ensaio nesta categoria ainda.
            </p>
          ) : (
            <div className="ensaios">
              {visiveis.map((ensaio) => {
                const fotos = fotosPorEnsaio[ensaio.id] ?? [];
                const srcs = (fotos.length ? fotos.map((f) => f.url) : [ensaio.cover_url].filter(Boolean))
                  .map((u) => cdnUrl(u, CDN.lightbox));
                const capa = ensaio.cover_url || srcs[0] || SLOT_PLACEHOLDER.hero_1;

                return (
                  <div key={ensaio.id} className="card" onClick={() => srcs.length && open(srcs, 0)}>
                    <Image
                      src={capa} alt={ensaio.titulo} fill
                      sizes="(max-width: 900px) 100vw, 33vw"
                    />
                    <div className="card-legenda">
                      <strong>{ensaio.titulo}</strong>
                      <em>
                        {CATEGORIA_LABEL[ensaio.categoria]}
                        {srcs.length > 0 && ` · ${srcs.length} ${srcs.length === 1 ? 'foto' : 'fotos'}`}
                      </em>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Rodapé simples */}
      <footer style={{ padding: '46px clamp(24px,6vw,110px)', borderTop: '1px solid #c9c3ba' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, letterSpacing: '.14em', color: '#6d675f' }}>
          <span>© {marca} — todos os direitos reservados</span>
          <a href="/" style={{ textTransform: 'uppercase', letterSpacing: '.18em' }}>← Voltar ao início</a>
        </div>
      </footer>
    </>
  );
}
