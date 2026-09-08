import { LightboxProvider } from '@/components/Lightbox';
import GaleriaCliente from './GaleriaCliente';
import { getGaleria } from '@/lib/photos';
import { MARCA } from '@/lib/data';

export const revalidate = 60;

export const metadata = { title: `Galeria — ${MARCA}` };

export default async function PaginaGaleria() {
  const fotos = await getGaleria();

  return (
    <LightboxProvider>
      <GaleriaCliente fotos={fotos} marca={MARCA} />
    </LightboxProvider>
  );
}
