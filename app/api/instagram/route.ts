import { NextResponse } from 'next/server';
import { getInstagramPosts } from '@/lib/instagram';

// Cache de 1h feito na camada lib (Supabase). Handler apenas expõe o feed.
export async function GET() {
  const posts = await getInstagramPosts();
  return NextResponse.json({ posts }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  });
}
