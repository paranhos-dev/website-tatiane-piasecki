import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEnsaios, getFotosPorEnsaio, getGaleria, getSlots, getTextos } from '@/lib/photos';
import Dashboard from './Dashboard';

export const dynamic = 'force-dynamic';

export default async function Admin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const [slots, textos, ensaios, galeria] = await Promise.all([
    getSlots(),
    getTextos(),
    getEnsaios(),
    getGaleria(),
  ]);

  // Depende dos ensaios ja carregados, entao roda depois.
  const fotosPorEnsaio = await getFotosPorEnsaio(ensaios.map((e) => e.id));

  return (
    <Dashboard
      email={user.email ?? ''}
      slots={slots}
      textos={textos}
      ensaios={ensaios}
      fotosPorEnsaio={fotosPorEnsaio}
      galeria={galeria}
    />
  );
}
