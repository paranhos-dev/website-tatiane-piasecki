import { v2 as cloudinary } from 'cloudinary';

// Reexportado para quem ja importa daqui; a implementacao vive em lib/imagens.ts
// porque este modulo carrega o SDK Node e nao pode entrar em Client Components.
export { cdnUrl, ehCloudinary, CDN } from './imagens';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadBuffer(buffer: Buffer, folder: string) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder }, (err, res) => {
      if (err || !res) return reject(err);
      resolve({ secure_url: res.secure_url, public_id: res.public_id });
    }).end(buffer);
  });
}

export async function destroy(publicId: string) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
}
