import Image from 'next/image';
import Hero from '@/components/Hero';
import { LightboxProvider } from '@/components/Lightbox';
import Ensaios from '@/components/Ensaios';
import Galeria from '@/components/Galeria';
import Instagram from '@/components/Instagram';
import {
  contarGaleriaExtra, getEnsaios, getFotosPorEnsaio, getGaleria, getSlots, getTextos,
} from '@/lib/photos';
import {
  HERO_PARES, MARCA, MAX_HOME_ENSAIOS, MAX_HOME_GALERIA, slotUrl,
} from '@/lib/data';

export const revalidate = 60;

const MINIATURAS = ['/assets/ph-p-02.svg', '/assets/ph-l-01.svg', '/assets/ph-p-05.svg', '/assets/ph-p-07.svg'];

export default async function Home() {
  const [slots, textos, ensaiosHome, galeriaHome, totalExtra] = await Promise.all([
    getSlots(),
    getTextos(),
    getEnsaios(true),
    getGaleria(true),
    contarGaleriaExtra(),
  ]);

  const ensaios = ensaiosHome.slice(0, MAX_HOME_ENSAIOS);
  const galeria = galeriaHome.slice(0, MAX_HOME_GALERIA);
  const fotosPorEnsaio = await getFotosPorEnsaio(ensaios.map((e) => e.id));

  const marca = MARCA;
  const paresHero = HERO_PARES.map(
    ([esq, dir]) => [slotUrl(slots, esq), slotUrl(slots, dir)] as [string, string],
  );
  const paragrafos = textos.sobre_bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // O rodapé usa as primeiras fotos da galeria; sem elas, os placeholders locais.
  const miniaturas = galeria.length >= 4 ? galeria.slice(0, 4).map((f) => f.url) : MINIATURAS;

  return (
    <LightboxProvider>
      <Hero pares={paresHero} marca={marca} />

      <section className="sec" id="sobre">
        <div className="wrap sobre">
          <div>
            <div className="rotulo">02 — sobre mim</div>
            <h2>{textos.sobre_titulo}</h2>
            {paragrafos.map((p, i) => <p key={i}>{p}</p>)}
            <a className="btn" href="#contato">Conheça meu trabalho</a>
          </div>
          <div>
            <Image
              src={slotUrl(slots, 'sobre_foto')}
              alt={`Retrato — ${marca}`}
              width={900} height={1200}
              sizes="(max-width: 900px) 100vw, 45vw"
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
        </div>
      </section>

      <Ensaios ensaios={ensaios} fotosPorEnsaio={fotosPorEnsaio} />
      <Galeria fotos={galeria} totalExtra={totalExtra} />
      <Instagram />

      <section className="faixa">
        <Image src={slotUrl(slots, 'cta_bg')} alt="" fill sizes="100vw" />
        <div className="veu" />
        <div className="faixa-conteudo">
          <h2>{textos.cta_titulo}</h2>
          <p>{textos.cta_sub}</p>
          <a className="btn" href="#contato">{textos.cta_botao}</a>
        </div>
      </section>

      <footer id="contato">
        <div className="wrap">
          <div className="rodape">
            <nav><a href="#inicio">Início</a><a href="#sobre">Sobre mim</a><a href="/ensaios">Ensaios</a></nav>
            <div>
              <div className="mini">
                {miniaturas.map((src, i) => (
                  <Image key={i} src={src} alt="" width={84} height={84} sizes="84px" />
                ))}
              </div>
              <div className="assine">acompanhe meu trabalho</div>
            </div>
            <nav className="dir"><a href="/galeria">Galeria</a><a href="#instagram">Instagram</a><a href="#contato">Contato</a></nav>
          </div>
          <div className="linha" />
          <div className="creditos">
            <span>© {marca} — todos os direitos reservados</span>
            <span>Template de apresentação</span>
          </div>
        </div>
      </footer>
    </LightboxProvider>
  );
}
