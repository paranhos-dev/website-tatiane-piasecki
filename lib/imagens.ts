// Helpers de imagem sem dependencia de Node — seguros em Client Components.
// (lib/cloudinary.ts importa o SDK e so pode ser usado no servidor.)

/** Uma URL de entrega do Cloudinary, onde da para injetar transformacoes. */
export function ehCloudinary(url: string): boolean {
  return url.includes('res.cloudinary.com') && url.includes('/upload/');
}

/**
 * Insere transformacoes na URL do Cloudinary: /upload/ -> /upload/<transform>/.
 * URLs que nao sao do Cloudinary (placeholders locais em /assets) voltam intactas.
 */
export function cdnUrl(url: string, transform: string): string {
  if (!url || !transform || !ehCloudinary(url)) return url;
  return url.replace('/upload/', `/upload/${transform}/`);
}

/** Presets por contexto de uso. */
export const CDN = {
  /**
   * Hero em tela cheia. Medido numa foto de 393 KB: q_auto:best em w_1920 devolveu
   * 407 KB (maior que o original) contra 196 KB em q_auto:good — e o hero ainda
   * fica sob o veu escuro, onde a diferenca nao aparece.
   */
  hero: 'w_1600,f_auto,q_auto:good',
  /** Retrato do "sobre mim". */
  retrato: 'w_900,f_auto,q_auto:good',
  /** Capas de ensaio e fotos do carrossel. */
  thumb: 'w_800,f_auto,q_auto:good',
  /** Miniaturas do rodape. */
  mini: 'w_200,f_auto,q_auto:good',
  /** Imagem aberta no lightbox. */
  lightbox: 'w_1920,f_auto,q_auto:good',
} as const;
