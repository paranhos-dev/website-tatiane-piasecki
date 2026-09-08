import { LightboxProvider } from '@/components/Lightbox';
import EnsaiosCliente from './EnsaiosCliente';
import { getEnsaios, getFotosPorEnsaio } from '@/lib/photos';
import { MARCA } from '@/lib/data';

export const revalidate = 60;

export const metadata = { title: `Ensaios — ${MARCA}` };

export default async function PaginaEnsaios() {
  const ensaios = await getEnsaios();
  const fotosPorEnsaio = await getFotosPorEnsaio(ensaios.map((e) => e.id));

  return (
    <LightboxProvider>
      <EnsaiosCliente ensaios={ensaios} fotosPorEnsaio={fotosPorEnsaio} marca={MARCA} />
    </LightboxProvider>
  );
}
