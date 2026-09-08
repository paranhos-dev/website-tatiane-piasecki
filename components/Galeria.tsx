'use client';
import { useRef, useState } from 'react';
import { useLightbox } from './Lightbox';
import { carregarMaisGaleria } from '@/app/acoes-publicas';
import type { GaleriaFoto } from '@/lib/data';
import { CDN, cdnUrl } from '@/lib/imagens';

const LOTE = 12;

export default function Galeria(
  { fotos, totalExtra }: { fotos: GaleriaFoto[]; totalExtra: number },
) {
  const { open } = useLightbox();
  const trilho = useRef<HTMLDivElement>(null);

  const [extras, setExtras] = useState<GaleriaFoto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [fim, setFim] = useState(false);

  const lista = [...fotos, ...extras];
  const srcs = lista.map((f) => cdnUrl(f.url, CDN.lightbox));
  const temMais = !fim && extras.length < totalExtra;

  if (lista.length === 0) {
    return (
      <section className="sec top0" id="galeria">
        <div className="wrap">
          <div className="cabeca">
            <h2>Galeria</h2>
            <a href="/galeria" style={{ fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--ouro)' }}>ver todas →</a>
          </div>
        </div>
      </section>
    );
  }

  function deslizar(direcao: number) {
    const el = trilho.current;
    if (!el) return;
    el.scrollBy({ left: direcao * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  async function verMais() {
    setCarregando(true);
    try {
      const novas = await carregarMaisGaleria(extras.length, LOTE);
      // Página curta ou vazia significa fim da lista — some com o botão.
      if (novas.length < LOTE) setFim(true);
      if (novas.length) setExtras((atuais) => [...atuais, ...novas]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className="sec top0" id="galeria">
      <div className="wrap">
        <div className="cabeca">
          <h2>Galeria</h2>
          <a href="/galeria" style={{ fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--ouro)' }}>ver todas →</a>
        </div>
      </div>

      <div className="carrossel-area">
        <div className="carrossel-veu esq" />
        <div className="carrossel-veu dir" />

        <button
          className="carrossel-seta esq" onClick={() => deslizar(-1)} aria-label="Anterior"
        >
          ←
        </button>

        <div className="carrossel" ref={trilho}>
          {lista.map((foto, i) => (
            /* <img> proposital: o carrossel tira a largura da proporcao real de cada
               foto (height:100%/width:auto). O <Image> fixaria um aspect-ratio nos
               atributos e deixaria todas com a mesma largura. */
            <img
              key={foto.id}
              src={cdnUrl(foto.url, CDN.thumb)}
              alt=""
              loading={i < 4 ? 'eager' : 'lazy'}
              decoding="async"
              onClick={() => open(srcs, i)}
            />
          ))}
        </div>

        <button
          className="carrossel-seta dir" onClick={() => deslizar(1)} aria-label="Próxima"
        >
          →
        </button>
      </div>

      {temMais && (
        <div className="wrap carrossel-mais">
          <button className="btn" onClick={verMais} disabled={carregando}>
            {carregando ? 'Carregando…' : 'Ver mais'}
          </button>
        </div>
      )}
    </section>
  );
}
