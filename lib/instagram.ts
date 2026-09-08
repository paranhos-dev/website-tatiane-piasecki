import { createAdminClient } from './supabase/server';
import { hasInstagram, hasSupabase } from './env';

export type IgPost = {
  id: string;
  media_url: string;
  permalink: string;
  caption?: string;
};

const FALLBACK: IgPost[] = Array.from({ length: 9 }, (_, i) => ({
  id: 'seed-' + i,
  media_url: `/assets/ph-p-0${(i % 8) + 1}.svg`,
  permalink: process.env.NEXT_PUBLIC_INSTAGRAM_PROFILE || 'https://instagram.com/',
  caption: '',
}));

const ONE_HOUR = 60 * 60 * 1000;

async function fetchFromGraph(): Promise<IgPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN!;
  const userId = process.env.INSTAGRAM_USER_ID!;
  const fields = 'id,media_type,media_url,thumbnail_url,permalink,caption';
  const url = `https://graph.instagram.com/${userId}/media?fields=${fields}&limit=9&access_token=${token}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Instagram Graph API: ' + res.status);
  const json = await res.json();
  return (json.data || []).slice(0, 9).map((m: any) => ({
    id: m.id,
    media_url: m.media_type === 'VIDEO' ? (m.thumbnail_url || m.media_url) : m.media_url,
    permalink: m.permalink,
    caption: m.caption || '',
  }));
}

// Busca com cache de 1h no Supabase (tabela instagram_cache: id text pk, data jsonb, updated_at timestamptz)
export async function getInstagramPosts(): Promise<IgPost[]> {
  if (!hasInstagram) return FALLBACK;

  if (hasSupabase && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createAdminClient();
    const { data: cached } = await db
      .from('instagram_cache').select('data, updated_at').eq('id', 'feed').maybeSingle();

    if (cached && Date.now() - new Date(cached.updated_at).getTime() < ONE_HOUR) {
      return cached.data as IgPost[];
    }
    try {
      const posts = await fetchFromGraph();
      await db.from('instagram_cache').upsert({ id: 'feed', data: posts, updated_at: new Date().toISOString() });
      return posts;
    } catch (e) {
      if (cached) return cached.data as IgPost[]; // serve cache velho se a API falhar
      return FALLBACK;
    }
  }

  try { return await fetchFromGraph(); } catch { return FALLBACK; }
}
