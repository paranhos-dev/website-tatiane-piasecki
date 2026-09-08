export const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const hasCloudinary =
  !!process.env.CLOUDINARY_CLOUD_NAME && !!process.env.CLOUDINARY_API_KEY && !!process.env.CLOUDINARY_API_SECRET;
export const hasInstagram =
  !!process.env.INSTAGRAM_ACCESS_TOKEN && !!process.env.INSTAGRAM_USER_ID;
