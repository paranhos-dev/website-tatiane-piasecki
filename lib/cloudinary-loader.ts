'use client';

/**
 * Loader do next/image apontando para o Cloudinary.
 *
 * Sem isso, o otimizador do Next baixaria a imagem do Cloudinary e a reencodaria —
 * dois processamentos e duas cobrancas para o mesmo resultado. Com o loader, o Next
 * continua gerando srcset e lazy loading, mas quem redimensiona e converte formato
 * e o proprio Cloudinary, via parametros na URL.
 *
 * `quality` >= 90 vira q_auto:best (hero); o resto usa q_auto:good.
 * URLs que nao sao do Cloudinary (placeholders em /assets) passam intactas.
 */
export default function cloudinaryLoader(
  { src, width, quality }: { src: string; width: number; quality?: number },
): string {
  if (!src.includes('res.cloudinary.com') || !src.includes('/upload/')) return src;

  const q = quality && quality >= 90 ? 'q_auto:best' : 'q_auto:good';
  // c_limit nunca amplia: uma foto menor que o slot e servida no tamanho original.
  return src.replace('/upload/', `/upload/f_auto,${q},c_limit,w_${width}/`);
}
