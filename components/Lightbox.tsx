'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Ctx = { open: (srcs: string[], i?: number) => void };
const LightboxCtx = createContext<Ctx>({ open: () => {} });
export const useLightbox = () => useContext(LightboxCtx);

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [lista, setLista] = useState<string[] | null>(null);
  const [i, setI] = useState(0);

  const open = useCallback((srcs: string[], inicio = 0) => { setLista(srcs); setI(inicio); }, []);
  const fechar = useCallback(() => setLista(null), []);
  const passo = useCallback((d: number) => setI((v) => (lista ? (v + d + lista.length) % lista.length : 0)), [lista]);

  useEffect(() => {
    document.body.style.overflow = lista ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (!lista) return;
      if (e.key === 'Escape') fechar();
      if (e.key === 'ArrowRight') passo(1);
      if (e.key === 'ArrowLeft') passo(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lista, fechar, passo]);

  return (
    <LightboxCtx.Provider value={{ open }}>
      {children}
      <div className={'lb' + (lista ? ' on' : '')} onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
        {lista && (
          <>
            <div className="lb-topo">
              <span>{i + 1} / {lista.length}</span>
              <button className="fechar" onClick={fechar} aria-label="Fechar">×</button>
            </div>
            <button className="seta esq" onClick={() => passo(-1)} aria-label="Anterior">←</button>
            <button className="seta dir" onClick={() => passo(1)} aria-label="Próxima">→</button>
            <img src={lista[i]} alt="" />
          </>
        )}
      </div>
    </LightboxCtx.Provider>
  );
}
