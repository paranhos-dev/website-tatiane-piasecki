import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getBiblioteca, getBibliotecaUso, getEnsaios, getFotosPorEnsaio, getGaleria, getGavetas,
  getPastas, getSlots, getTextos,
} from '@/lib/photos';
import Dashboard from './Dashboard';

export const dynamic = 'force-dynamic';

export default async function Admin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const [slots, textos, ensaios, galeria, biblioteca, gavetas, pastas] = await Promise.all([
    getSlots(),
    getTextos(),
    getEnsaios(),
    getGaleria(),
    getBiblioteca(),
    getGavetas(),
    getPastas(),
  ]);

  // Dependem do que já foi carregado, então rodam depois.
  const [fotosPorEnsaio, usoBiblioteca] = await Promise.all([
    getFotosPorEnsaio(ensaios.map((e) => e.id)),
    getBibliotecaUso(biblioteca.map((f) => f.public_id)),
  ]);

  return (
    <Dashboard
      email={user.email ?? ''}
      slots={slots}
      textos={textos}
      ensaios={ensaios}
      fotosPorEnsaio={fotosPorEnsaio}
      galeria={galeria}
      biblioteca={biblioteca}
      usoBiblioteca={usoBiblioteca}
      gavetas={gavetas}
      pastas={pastas}
    />
  );
}
