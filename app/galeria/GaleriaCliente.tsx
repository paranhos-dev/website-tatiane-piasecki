'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useLightbox } from '@/components/Lightbox';
import type { GaleriaFoto } from '@/lib/data';
import { CDN, cdnUrl } from '@/lib/imagens';

const LOTE = 24;

export default function GaleriaCliente(
  { fotos, marca }: { fotos: GaleriaFoto[]; marca: string },
) {
  const { open } = useLightbox();
  const [visiveis, setVisiveis] = useState(LOTE);

  const lista = fotos.slice(0, visiveis);
  const srcs = fotos.map((f) => cdnUrl(f.url, CDN.lightbox));
  const temMais = visiveis < fotos.length;

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
          <a href="/ensaios">Ensaios</a>
          <a href="/#contato">Contato</a>
        </nav>
      </header>

      <main style={{ padding: 'clamp(60px,8vw,110px) clamp(24px,6vw,110px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24, marginBottom: 52 }}>
            <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 'clamp(28px,3.4vw,46px)', margin: 0 }}>
              Galeria
            </h1>
            <span style={{ fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--ouro)' }}>
              {fotos.length} {fotos.length === 1 ? 'imagem' : 'imagens'}
            </span>
          </div>

          {fotos.length === 0 ? (
            <p style={{ color: 'rgba(20,17,15,.45)', fontSize: 14, letterSpacing: '.14em', textTransform: 'uppercase' }}>
              Nenhuma foto na galeria ainda.
            </p>
          ) : (
            <>
              {/* Grid masonry-like com colunas */}
              <div style={{
                columns: 'clamp(180px,22vw,280px)',
                columnGap: 'clamp(10px,1.6vw,20px)',
              }}>
                {lista.map((foto, i) => (
                  <div
                    key={foto.id}
                    onClick={() => open(srcs, i)}
                    style={{ breakInside: 'avoid', marginBottom: 'clamp(10px,1.6vw,20px)', cursor: 'zoom-in', overflow: 'hidden' }}
                  >
                    <Image
                      src={foto.url}
                      alt=""
                      width={800} height={1067}
                      sizes="(max-width: 700px) 50vw, (max-width: 1240px) 33vw, 280px"
                      priority={i < 4}
                      style={{ width: '100%', height: 'auto', display: 'block', transition: 'transform .6s ease, opacity .3s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.opacity = '.88'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.opacity = ''; }}
                    />
                  </div>
                ))}
              </div>

              {temMais && (
                <div style={{ textAlign: 'center', marginTop: 52 }}>
                  <button
                    onClick={() => setVisiveis((v) => v + LOTE)}
                    className="btn"
                    style={{ marginTop: 0 }}
                  >
                    Ver mais ({fotos.length - visiveis} restantes)
                  </button>
                </div>
              )}
            </>
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
