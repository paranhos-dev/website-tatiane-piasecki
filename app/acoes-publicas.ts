'use server';
import { getGaleriaExtra } from '@/lib/photos';
import type { GaleriaFoto } from '@/lib/data';

/**
 * Alimenta o botão "ver mais" do carrossel: devolve, em páginas, as fotos da
 * tabela galeria que estão com na_home = false. Leitura pública, sem sessão.
 */
export async function carregarMaisGaleria(offset: number, limite = 12): Promise<GaleriaFoto[]> {
  const seguro = Math.min(Math.max(limite, 1), 36);
  return getGaleriaExtra(Math.max(offset, 0), seguro);
}
