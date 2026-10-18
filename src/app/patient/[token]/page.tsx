import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDeviceHousehold } from '@/lib/household';
import { supabaseAdmin } from '@/lib/supabase/server';
import { PatientApp } from './patient-app';

export const metadata: Metadata = { title: 'Remi', robots: { index: false, follow: false } };

export default async function PatientPage({ params, searchParams }: {
  params: Promise<{ token: string }>; searchParams: Promise<{ theme?: string | string[]; debug?: string | string[] }>;
}) {
  const { token } = await params;
  // ?theme=day|night pins the look (demos, filming); otherwise it follows the time in her home
  const sp = await searchParams;
  const asked = sp.theme;
  const theme = asked === 'day' || asked === 'night' ? asked : undefined;
  const householdId = await getDeviceHousehold(token);
  if (!householdId) notFound();
  const { data: h } = await supabaseAdmin().from('households').select('preferred_name, language').eq('id', householdId).single();
  if (!h) notFound();
  const { data: people } = await supabaseAdmin().from('people').select('name, relation, is_deceased').eq('household_id', householdId).order('created_at');
  return (
    <PatientApp
      token={token} preferredName={h.preferred_name} language={h.language} theme={theme} debug={sp.debug === '1'}
      people={(people ?? []).map((p) => ({ name: p.name, relation: p.relation, isDeceased: p.is_deceased }))}
    />
  );
}
