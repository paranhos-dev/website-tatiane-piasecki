'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(''); setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    // Em caso de sucesso o loading permanece até a navegação concluir.
    if (error) { setErro('E-mail ou senha inválidos.'); setCarregando(false); return; }
    router.push('/admin');
    router.refresh();
  }

  if (carregando) {
    return (
      <main
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#f0ede8] px-6"
      >
        <style>{`
          @keyframes lg-entrada { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
          @keyframes lg-percurso { from { left: 0 } to { left: 60% } }
          @keyframes lg-respiro { 0%, 100% { opacity: .3 } 50% { opacity: .75 } }
          .lg-bloco { animation: lg-entrada 800ms cubic-bezier(.22,.61,.36,1) both }
          .lg-traco { animation: lg-percurso 1.7s cubic-bezier(.45,0,.55,1) infinite alternate }
          .lg-legenda { animation: lg-respiro 2.6s ease-in-out infinite }
          @media (prefers-reduced-motion: reduce) {
            .lg-bloco { animation: none }
            .lg-traco { animation: none; left: 30% }
            .lg-legenda { animation: none; opacity: .55 }
          }
        `}</style>

        <div className="lg-bloco flex flex-col items-center">
          <div className="font-serif text-[28px] md:text-[34px] tracking-[0.22em] text-tinta text-center leading-none">
            ESTÚDIO NOME
          </div>
          <p className="mt-4 text-[11px] uppercase tracking-[0.28em] text-ouro">Painel privado</p>

          <div className="relative mt-12 h-px w-44 overflow-hidden bg-tinta/15">
            <span className="lg-traco absolute top-0 left-0 h-px w-[40%] bg-ouro" />
          </div>

          <p className="lg-legenda mt-7 text-[11px] uppercase tracking-[0.22em] text-tinta">
            Entrando
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-papel px-6">
      <form onSubmit={entrar} className="w-full max-w-sm bg-white/70 border border-black/10 p-10">
        <div className="font-serif text-2xl tracking-[0.18em] text-center mb-1">ESTÚDIO NOME</div>
        <p className="text-center text-xs tracking-[0.22em] uppercase text-ouro mb-8">Painel privado</p>
        <label className="block text-xs uppercase tracking-[0.18em] mb-1">E-mail</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-5 border border-black/20 bg-transparent px-3 py-2 outline-none focus:border-ouro" />
        <label className="block text-xs uppercase tracking-[0.18em] mb-1">Senha</label>
        <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
          className="w-full mb-6 border border-black/20 bg-transparent px-3 py-2 outline-none focus:border-ouro" />
        {erro && <p className="text-red-700 text-sm mb-4">{erro}</p>}
        <button disabled={carregando}
          className="w-full py-3 bg-tinta text-white text-xs uppercase tracking-[0.2em] disabled:opacity-50">
          Entrar
        </button>
      </form>
    </main>
  );
}
