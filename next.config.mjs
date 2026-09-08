/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions rejeitam o request com 413 antes de a action rodar quando o
  // corpo passa do limite. O default do Next e 1 MB — pequeno demais para fotos.
  experimental: {
    serverActions: { bodySizeLimit: '25mb' },
  },
  images: {
    // Loader proprio: o Cloudinary faz resize/formato, o Next so monta o srcset.
    // Evita a dupla otimizacao (Next reencodando o que o Cloudinary ja converteu).
    loader: 'custom',
    loaderFile: './lib/cloudinary-loader.ts',
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' }
    ]
  }
};
export default nextConfig;
