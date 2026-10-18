import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import { hashDeviceToken } from '@/lib/device-token';
import { demoMorningTimes } from '@/core/demo-times';
import embeddings from '@/demo/embeddings.json';

import { DEMO_HOUSEHOLD_ID } from '@/core/demo';

export { DEMO_HOUSEHOLD_ID };
const TZ = 'Asia/Kolkata';
type DemoEmbedding = { person: string; photo_path: string; embedding: number[] };

export async function seedDemo(): Promise<void> {
  const db = supabaseAdmin();
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  const token = process.env.DEMO_DEVICE_TOKEN;
  if (!email || !password || !token) throw new Error('DEMO_EMAIL, DEMO_PASSWORD and DEMO_DEVICE_TOKEN are required');

  // demo login user
  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;
  let userId = list.users.find((u) => u.email === email)?.id;
  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
  } else {
    await db.auth.admin.updateUserById(userId, { password });
  }

  // household with a stable id, so storage paths survive resets
  const { error: hErr } = await db.from('households').upsert({
    id: DEMO_HOUSEHOLD_ID, patient_name: 'Avni Devi', preferred_name: 'Avni', language: 'en-IN', timezone: TZ,
    about: 'Retired Hindi teacher from Jaipur, 78. Loves old Lata Mangeshkar songs, her rose garden and making rajma on Sundays. Lives with her daughter Priya.',
    home_address: 'B-14, Shanti Nagar, Jaipur', primary_contact_name: 'Priya', primary_contact_phone: '+91 98xxxxxx10', telegram_chat_id: null,
  });
  if (hErr) throw hErr;
  await db.from('household_members').upsert({ household_id: DEMO_HOUSEHOLD_ID, user_id: userId, role: 'owner' });

  // wipe children, keep the household and its storage
  for (const t of ['events', 'digests', 'sensitive_guidance', 'routine_items', 'face_embeddings', 'people', 'devices'] as const) {
    const { error } = await db.from(t).delete().eq('household_id', DEMO_HOUSEHOLD_ID);
    if (error) throw error;
  }

  const { data: people, error: pErr } = await db.from('people').insert([
    { household_id: DEMO_HOUSEHOLD_ID, name: 'Rohan', relation: 'grandson', notes: 'Plays cricket for his college team. Ask him about his last match.', is_deceased: false },
    { household_id: DEMO_HOUSEHOLD_ID, name: 'Priya', relation: 'daughter', notes: "Lives with Avni. Works as a nurse. Loves her mother's rajma.", is_deceased: false },
    { household_id: DEMO_HOUSEHOLD_ID, name: 'Ramesh', relation: 'husband', notes: 'Married 52 years. Loved Sunday walks to the temple.', is_deceased: true },
  ]).select('id, name');
  if (pErr || !people) throw pErr ?? new Error('people insert failed');
  const id = (name: string) => people.find((p) => p.name === name)!.id;

  await db.from('routine_items').insert([
    { household_id: DEMO_HOUSEHOLD_ID, time_of_day: '08:00', kind: 'medicine', label: 'Morning tablet', spoken_message: 'Avni, it is time for your morning tablet, with a glass of water.' },
    { household_id: DEMO_HOUSEHOLD_ID, time_of_day: '08:30', kind: 'meal', label: 'Breakfast', spoken_message: 'Breakfast is ready, Avni. Poha today.' },
    { household_id: DEMO_HOUSEHOLD_ID, time_of_day: '13:00', kind: 'meal', label: 'Lunch', spoken_message: 'It is lunch time, Avni.' },
    { household_id: DEMO_HOUSEHOLD_ID, time_of_day: '17:00', kind: 'activity', label: 'Water the roses', spoken_message: 'Shall we water the roses together?' },
    { household_id: DEMO_HOUSEHOLD_ID, time_of_day: '20:00', kind: 'medicine', label: 'Night tablet', spoken_message: 'Avni, it is time for your night tablet.' },
  ]);

  await db.from('sensitive_guidance').insert([
    {
      household_id: DEMO_HOUSEHOLD_ID, topic: 'Her husband Ramesh', trigger_words: ['Ramesh', 'my husband', 'husband', 'पति'], approach: 'share_memory',
      family_script: 'Ramesh loved your Sunday walks to the temple. He always said your rajma was the best in Jaipur.',
    },
    {
      household_id: DEMO_HOUSEHOLD_ID, topic: 'Her mother', trigger_words: ['my mother', 'mother', 'amma', 'माँ'], approach: 'call_relative',
      family_script: 'Priya will call you in a minute to talk about Nani.', call_person_id: id('Priya'),
    },
  ]);

  await db.from('devices').insert({ household_id: DEMO_HOUSEHOLD_ID, token_hash: hashDeviceToken(token), label: 'Demo tablet' });

  const faceRows = (embeddings as DemoEmbedding[])
    .filter((e) => people.some((p) => p.name === e.person))
    .map((e) => ({ household_id: DEMO_HOUSEHOLD_ID, person_id: id(e.person), embedding: e.embedding, photo_path: e.photo_path }));
  if (faceRows.length) await db.from('face_embeddings').insert(faceRows);

  // a believable morning so the digest and family home have something to show
  const [t1, t2, t3, t4] = demoMorningTimes(new Date(), TZ, [500, 550, 585, 615]);
  await db.from('events').insert([
    { household_id: DEMO_HOUSEHOLD_ID, type: 'conversation', created_at: t1.toISOString(),
      payload: { text: 'What day is it?', reply: 'It is a lovely day, Avni. The roses are out.', mood: 'calm', fallback: false } },
    { household_id: DEMO_HOUSEHOLD_ID, type: 'conversation', created_at: t2.toISOString(),
      payload: { text: 'What day is it?', reply: 'It is a lovely day, Avni. Shall we look at the roses?', mood: 'confused', fallback: false } },
    { household_id: DEMO_HOUSEHOLD_ID, type: 'conversation', created_at: t3.toISOString(),
      payload: { text: 'Where is Ramesh?', reply: 'Ramesh loved your Sunday walks to the temple. He always said your rajma was the best in Jaipur.', mood: 'sad', sensitiveTopic: 'Her husband Ramesh', fallback: false } },
    { household_id: DEMO_HOUSEHOLD_ID, type: 'face_query', created_at: t4.toISOString(), payload: { status: 'match', name: 'Rohan' } },
  ]);
}
