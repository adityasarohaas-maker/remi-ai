import 'server-only';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { supabaseAdmin } from '@/lib/supabase/server';
import { hashDeviceToken } from '@/lib/device-token';
import { demoMorningTimes } from '@/core/demo-times';
import embeddings from '@/demo/embeddings.json';
import demoMemories from '@/demo/memories.json';
import type { LifeStage, MemoryKind, Visibility } from '@/core/types';

import { DEMO_HOUSEHOLD_ID, demoStableId as stableId } from '@/core/demo';

export { DEMO_HOUSEHOLD_ID };
const TZ = 'Asia/Kolkata';
type DemoEmbedding = { person: string; photo_path: string; embedding: number[] };
type DemoMemory = {
  key: string; title: string; summary: string; quote: string; lifeStage: LifeStage; kind: MemoryKind;
  yearFrom?: number; yearTo?: number; people: string[]; places: string[]; daysAgo: number;
  confidence?: 'sure' | 'unsure'; visibility?: Visibility; forNames?: string[]; openEvent?: string; recipientName?: string;
};

const CLIP_EXTS = ['.mp3', '.m4a', '.webm', '.ogg'];
const MIME: Record<string, string> = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.webm': 'audio/webm', '.ogg': 'audio/ogg' };

async function demoUser(db: ReturnType<typeof supabaseAdmin>, email: string, password: string): Promise<string> {
  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;
  const found = list.users.find((u) => u.email === email)?.id;
  if (found) { await db.auth.admin.updateUserById(found, { password }); return found; }
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

/** Uploads a file only if the bucket doesn't have it yet; true when the object exists afterwards. */
async function ensureObject(db: ReturnType<typeof supabaseAdmin>, bucket: string, path: string, local: string | null, contentType: string): Promise<boolean> {
  const dir = path.slice(0, path.lastIndexOf('/'));
  const name = path.slice(path.lastIndexOf('/') + 1);
  const { data: listed } = await db.storage.from(bucket).list(dir, { search: name });
  if (listed?.some((o) => o.name === name)) return true;
  if (!local || !existsSync(local)) return false;
  const { error } = await db.storage.from(bucket).upload(path, readFileSync(local), { contentType, upsert: true });
  if (error) { console.error(`upload ${path} failed`, error.message); return false; }
  return true;
}

export async function seedDemo(): Promise<void> {
  const db = supabaseAdmin();
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  const token = process.env.DEMO_DEVICE_TOKEN;
  if (!email || !password || !token) throw new Error('DEMO_EMAIL, DEMO_PASSWORD and DEMO_DEVICE_TOKEN are required');

  // demo logins: Priya (owner, the one on the landing page) and Arjun (family)
  const priyaId = await demoUser(db, email, password);
  const [local, domain] = email.split('@');
  const arjunId = await demoUser(db, `${local}+arjun@${domain}`, password);

  // household with a stable id, so storage paths survive resets
  const { error: hErr } = await db.from('households').upsert({
    id: DEMO_HOUSEHOLD_ID, patient_name: 'Avni Devi', preferred_name: 'Avni', language: 'en-IN', timezone: TZ,
    about: 'Retired Hindi teacher from Jaipur, 78. Loves old Lata Mangeshkar songs, her rose garden and making rajma on Sundays. Lives with her daughter Priya. Her husband Ramesh passed in 2021.',
    home_address: 'B-14, Shanti Nagar, Jaipur', primary_contact_name: 'Priya', primary_contact_phone: '+91 98xxxxxx10', telegram_chat_id: null,
    care_type: 'elderly', status: 'living', passed_on: null, passed_marked_at: null, is_demo: true, extracted_through: 0,
  });
  if (hErr) throw hErr;
  await db.from('household_members').upsert([
    { household_id: DEMO_HOUSEHOLD_ID, user_id: priyaId, role: 'owner', display_name: 'Priya', email },
    { household_id: DEMO_HOUSEHOLD_ID, user_id: arjunId, role: 'family', display_name: 'Arjun', email: `${local}+arjun@${domain}` },
  ]);

  // wipe children, keep the household and its storage
  for (const t of ['memories', 'family_questions', 'photos', 'life_events', 'care_signals', 'care_contacts', 'letter_links', 'recordings', 'invites',
    'events', 'digests', 'sensitive_guidance', 'routine_items', 'face_embeddings', 'people', 'devices'] as const) {
    const q = t === 'letter_links'
      ? db.from(t).delete().in('memory_id', (await db.from('memories').select('id').eq('household_id', DEMO_HOUSEHOLD_ID)).data?.map((m) => m.id) ?? ['00000000-0000-4000-8000-000000000000'])
      : db.from(t).delete().eq('household_id', DEMO_HOUSEHOLD_ID);
    const { error } = await q;
    if (error) throw error;
  }

  const { data: people, error: pErr } = await db.from('people').insert([
    { household_id: DEMO_HOUSEHOLD_ID, name: 'Rohan', relation: 'grandson', notes: 'Plays cricket for his college team. Ask him about his last match.', is_deceased: false },
    { household_id: DEMO_HOUSEHOLD_ID, name: 'Priya', relation: 'daughter', notes: "Lives with Avni. Works as a nurse. Loves her mother's rajma.", is_deceased: false },
    { household_id: DEMO_HOUSEHOLD_ID, name: 'Arjun', relation: 'son', notes: 'Lives in Dubai. Calls on Sundays.', is_deceased: false },
    { household_id: DEMO_HOUSEHOLD_ID, name: 'Riya', relation: 'granddaughter', notes: "Arjun's daughter. Getting married next year.", is_deceased: false },
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

  // her say: she agreed herself, and allowed Talk with her after
  await db.from('consents').upsert({
    household_id: DEMO_HOUSEHOLD_ID, record_voice: true, default_visibility: 'everyone', allow_persona: true, allow_voice_clone: false,
    decided_by: 'person', decided_by_name: 'Avni', recording_id: null, decided_at: new Date(Date.now() - 45 * 86_400_000).toISOString(),
  });

  // a day she is waiting for
  const { data: wedding } = await db.from('life_events').insert({ household_id: DEMO_HOUSEHOLD_ID, name: "Riya's wedding", happened_on: null }).select('id').single();

  // her voice: clips uploaded once from demo/clips (left alone on later resets), one recording row per memory
  const clipsDir = join(process.cwd(), 'demo', 'clips');
  const onDisk = existsSync(clipsDir) ? readdirSync(clipsDir) : [];
  const memories = demoMemories as DemoMemory[];
  const recordingRows: { id: string; household_id: string; storage_path: string; mime: string; transcript: string; language: string; created_at: string }[] = [];
  const clipFor = new Map<string, string>();
  for (const [i, m] of memories.entries()) {
    const ext = CLIP_EXTS.find((e) => onDisk.includes(`${m.key}${e}`));
    // the bucket may already hold it under any extension: check the common ones
    let path: string | null = null;
    for (const e of ext ? [ext] : CLIP_EXTS) {
      const p = `demo/clips/${m.key}${e}`;
      if (await ensureObject(db, 'voice', p, ext ? join(clipsDir, `${m.key}${ext}`) : null, MIME[e])) { path = p; break; }
    }
    if (!path) continue;
    const rid = stableId(i, 'c');
    const createdAt = new Date(Date.now() - m.daysAgo * 86_400_000).toISOString();
    recordingRows.push({ id: rid, household_id: DEMO_HOUSEHOLD_ID, storage_path: path, mime: MIME[path.slice(path.lastIndexOf('.'))], transcript: m.quote, language: 'en', created_at: createdAt });
    clipFor.set(m.key, rid);
  }
  if (recordingRows.length) { const { error } = await db.from('recordings').insert(recordingRows); if (error) throw error; }

  // the photos the family added, uploaded once
  const photosDir = join(process.cwd(), 'src', 'demo', 'photos');
  const photos = [
    { file: 'wedding-1968.svg', note: 'Wedding day, Ajmer', year: 1968 },
    { file: 'school-1985.svg', note: 'At the blackboard', year: 1985 },
    { file: 'roses-2008.svg', note: 'The rose garden, second year', year: 2008 },
    { file: 'varanasi-2012.svg', note: 'Varanasi, the boat at dawn', year: 2012 },
  ];
  const photoRows = [];
  for (const [i, p] of photos.entries()) {
    const path = `${DEMO_HOUSEHOLD_ID}/photos/${p.file}`;
    if (!(await ensureObject(db, 'family-media', path, join(photosDir, p.file), 'image/svg+xml'))) continue;
    photoRows.push({ id: stableId(i, 'p'), household_id: DEMO_HOUSEHOLD_ID, storage_path: path, note: p.note, year: p.year, uploaded_by: priyaId, shown_at: i < 2 ? new Date(Date.now() - (10 - i) * 86_400_000).toISOString() : null, created_at: new Date(Date.now() - 20 * 86_400_000).toISOString() });
  }
  if (photoRows.length) { const { error } = await db.from('photos').insert(photoRows); if (error) throw error; }
  const photoByKey: Record<string, string> = { 'wedding-day': stableId(0, 'p'), 'thirty-one-years': stableId(1, 'p') };

  // the family's questions: one Remi has yet to ask, one Avni answered
  const { data: qs } = await db.from('family_questions').insert([
    { household_id: DEMO_HOUSEHOLD_ID, asked_by: arjunId, question: 'Ask Amma what Papa was like when they first met', status: 'answered', asked_at: new Date(Date.now() - 27 * 86_400_000).toISOString(), created_at: new Date(Date.now() - 29 * 86_400_000).toISOString() },
    { household_id: DEMO_HOUSEHOLD_ID, asked_by: priyaId, question: 'Ask her about the 1971 war, she never talks about it', status: 'pending', created_at: new Date(Date.now() - 2 * 86_400_000).toISOString() },
  ]).select('id, status');
  const answeredQ = qs?.find((q) => q.status === 'answered')?.id ?? null;

  // the memories themselves
  const rows = memories.map((m) => {
    const forPriya = m.forNames?.includes('Priya');
    return {
      household_id: DEMO_HOUSEHOLD_ID, title: m.title, summary: m.summary, quote: m.quote, language: 'en', translation: null,
      recording_id: clipFor.get(m.key) ?? null, life_stage: m.lifeStage, year_from: m.yearFrom ?? null, year_to: m.yearTo ?? null,
      people: m.people, places: m.places, kind: m.kind, confidence: m.confidence ?? 'sure',
      visibility: m.visibility ?? 'everyone', visible_to: forPriya ? [priyaId] : [],
      recipient_name: m.recipientName ?? null, recipient_email: null, open_on: null,
      open_event_id: m.openEvent && wedding ? wedding.id : null, opened_at: null,
      question_id: m.key === 'meeting-ramesh' ? answeredQ : null, photo_id: photoByKey[m.key] ?? null,
      created_at: new Date(Date.now() - m.daysAgo * 86_400_000).toISOString(),
    };
  });
  const { data: inserted, error: mErr } = await db.from('memories').insert(rows).select('id, question_id');
  if (mErr) throw mErr;
  const answerMemory = inserted?.find((m) => m.question_id)?.id;
  if (answeredQ && answerMemory) await db.from('family_questions').update({ answered_memory_id: answerMemory }).eq('id', answeredQ);

  // things worth a look, this week
  await db.from('care_signals').insert([
    { household_id: DEMO_HOUSEHOLD_ID, kind: 'appetite', detail: "I didn't eat lunch, I wasn't hungry.", created_at: new Date(Date.now() - 3 * 86_400_000).toISOString() },
    { household_id: DEMO_HOUSEHOLD_ID, kind: 'pain', detail: 'My knee is sore again today, the stairs are hard.', created_at: new Date(Date.now() - 86_400_000).toISOString() },
    { household_id: DEMO_HOUSEHOLD_ID, kind: 'fear', detail: 'I get nervous at night when the house is so quiet.', created_at: new Date(Date.now() - 6 * 3_600_000).toISOString() },
  ]);
  await db.from('care_contacts').insert({ household_id: DEMO_HOUSEHOLD_ID, name: 'Sister Mary, Jaipur Home Care', email: 'care@example.com' });

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
