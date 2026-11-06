import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppointmentRequest } from '@workspace/api-client-react';
import { useCabinetSession } from '@/components/auth-provider';
import { cmsRequest } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export function AdminAppointmentsPanel() {
  const { session } = useCabinetSession();
  const client = useQueryClient();
  const key = ['cabinet', 'appointments', session?.user.id];
  const requests = useQuery({
    queryKey: key,
    queryFn: () => cmsRequest<AppointmentRequest[]>('/admin/appointments'),
    enabled: !!session,
    refetchInterval: 30_000,
    staleTime: 0,
    retry: false,
  });
  const remove = useMutation({
    mutationFn: (id: string) => cmsRequest<void>(`/admin/appointments/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  return <section className="mb-8 rounded-2xl border bg-white p-6" aria-labelledby="appointments-title">
    <h2 id="appointments-title" className="text-xl font-semibold">Demandes de rendez-vous</h2>
    <p className="mt-2 text-sm text-muted-foreground">Espace privé du cabinet. Consultez et supprimez les demandes selon votre politique de conservation. Les 500 plus récentes sont affichées.</p>
    {requests.isLoading && <p role="status" className="mt-4">Chargement des demandes…</p>}
    {requests.error && <p role="alert" className="mt-4 text-red-700">{requests.error.message}</p>}
    {remove.error && <p role="alert" className="mt-4 text-red-700">{remove.error.message}</p>}
    {requests.data?.length === 0 && <p className="mt-4 text-sm">Aucune demande enregistrée.</p>}
    <div className="mt-4 grid gap-3">
      {requests.data?.map(item => <article key={item.id} className="rounded-xl border p-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="font-semibold">{item.name} — {item.service}</h3>
            <p className="text-sm">{new Date(item.createdAt).toLocaleString('fr-FR')} · Date souhaitée : {item.preferredDate || 'Non précisée'}</p>
            <p className="mt-1 text-sm font-medium text-[#18365f]">Plage préférée : {item.preferredWindow === 'weekdays' ? 'Lundi–vendredi · 16 h–19 h (sur rendez-vous)' : item.preferredWindow === 'saturday' ? 'Samedi · 10 h–14 h (sur rendez-vous)' : 'Non précisée'}</p>
            <p className="mt-2 text-sm"><a className="underline" href={`tel:${item.phone.replace(/[^\d+]/g, '')}`}>{item.phone}</a> · <a className="underline" href={`mailto:${item.email}`}>{item.email}</a></p>
            {item.message && <p className="mt-2 whitespace-pre-wrap text-sm">{item.message}</p>}
          </div>
          <Button variant="destructive" disabled={remove.isPending} onClick={() => {
            if (window.confirm('Supprimer définitivement cette demande et ses coordonnées ?')) remove.mutate(item.id);
          }}>Supprimer</Button>
        </div>
      </article>)}
    </div>
  </section>;
}
