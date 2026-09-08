'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const SEGUNDOS = 5;

export default function Hero(
  { pares, marca }: { pares: [string, string][]; marca: string },
) {
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    if (pares.length < 2) return;
    const t = setInterval(() => setAtual((a) => (a + 1) % pares.length), SEGUNDOS * 1000);
    return () => clearInterval(t);
  }, [pares.length]);

  return (
    <section className="hero" id="inicio">
      {pares.map(([esq, dir], i) => (
        <div key={i} className={'hero-slide' + (i === atual ? ' on' : '')}>
          <div>
            <Image
              src={esq} alt="" fill sizes="50vw"
              priority={i === 0} loading={i === 0 ? undefined : 'lazy'}
            />
          </div>
          <div>
            <Image
              src={dir} alt="" fill sizes="50vw"
              priority={i === 0} loading={i === 0 ? undefined : 'lazy'}
            />
          </div>
        </div>
      ))}
      <div className="hero-veu" />

      <header className="topo">
        <div className="risco" />
        <div className="marca">{marca}</div>
        <div className="risco" />
        <div className="menu-icone"><span /><span /><span /></div>
      </header>

      <nav className="hero-nav">
        <a href="#inicio"><b>01</b><span>Início</span></a>
        <a href="#sobre"><b>02</b><span className="it">sobre mim</span></a>
        <a href="#ensaios"><b>03</b><span>Ensaios</span></a>
        <a href="#galeria"><b>04</b><span>Galeria</span></a>
        <a href="#contato"><b>05</b><span className="it">contato</span></a>
      </nav>

      {pares.length > 1 && (
        <div className="pontos">
          {pares.map((_, i) => (
            <i
              key={i}
              className={i === atual ? 'on' : ''}
              onClick={() => setAtual(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
