import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDeviceHousehold } from '@/lib/household';
import { supabaseAdmin } from '@/lib/supabase/server';
import { PatientApp } from './patient-app';

export const metadata: Metadata = { title: 'Remi', robots: { index: false, follow: false } };

export default async function PatientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const householdId = await getDeviceHousehold(token);
  if (!householdId) notFound();
  const { data: h } = await supabaseAdmin().from('households').select('preferred_name, language').eq('id', householdId).single();
  if (!h) notFound();
  return <PatientApp token={token} preferredName={h.preferred_name} language={h.language} />;
}
