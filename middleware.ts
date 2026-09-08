import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieList = { name: string; value: string; options: CookieOptions }[];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Sem Supabase configurado, não trava o acesso (ambiente de dev inicial).
  if (!url || !key) return res;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(list: CookieList) {
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const protegida = path.startsWith('/admin') && path !== '/admin/login';

  if (protegida && !user) {
    const login = req.nextUrl.clone();
    login.pathname = '/admin/login';
    return NextResponse.redirect(login);
  }
  if (path === '/admin/login' && user) {
    const admin = req.nextUrl.clone();
    admin.pathname = '/admin';
    return NextResponse.redirect(admin);
  }
  return res;
}

export const config = { matcher: ['/admin/:path*'] };
