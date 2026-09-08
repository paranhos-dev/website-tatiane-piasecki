'use client';
import Image from 'next/image';
import { useLightbox } from './Lightbox';
import { CATEGORIA_LABEL, Ensaio, EnsaioFoto, SLOT_PLACEHOLDER } from '@/lib/data';
import { CDN, cdnUrl } from '@/lib/imagens';

export default function Ensaios(
  { ensaios, fotosPorEnsaio }:
  { ensaios: Ensaio[]; fotosPorEnsaio: Record<string, EnsaioFoto[]> },
) {
  const { open } = useLightbox();
  if (ensaios.length === 0) {
    return (
      <section className="sec top0" id="ensaios">
        <div className="wrap">
          <div className="cabeca">
            <h2>Ensaios</h2>
            <a href="/ensaios" style={{ fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--ouro)' }}>ver todos →</a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="sec top0" id="ensaios">
      <div className="wrap">
        <div className="cabeca">
          <h2>Ensaios</h2>
          <a href="/ensaios" style={{ fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--ouro)' }}>ver todos →</a>
        </div>

        <div className="ensaios">
          {ensaios.map((ensaio) => {
            const fotos = fotosPorEnsaio[ensaio.id] ?? [];
            // Sem fotos internas, o lightbox abre ao menos a capa.
            const srcs = (fotos.length ? fotos.map((f) => f.url) : [ensaio.cover_url].filter(Boolean))
              .map((u) => cdnUrl(u, CDN.lightbox));
            const capa = ensaio.cover_url || srcs[0] || SLOT_PLACEHOLDER.hero_1;

            return (
              <div
                key={ensaio.id}
                className="card"
                onClick={() => srcs.length && open(srcs, 0)}
              >
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
      </div>
    </section>
  );
}
