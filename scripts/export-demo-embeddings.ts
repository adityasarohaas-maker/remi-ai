// npx tsx --env-file=.env.local scripts/export-demo-embeddings.ts
// Saves the demo family's enrolled face embeddings so nightly resets keep recognition working.
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data, error } = await db.from('face_embeddings')
  .select('embedding, photo_path, people(name)')
  .eq('household_id', '00000000-0000-4000-8000-00000000d3a0');
if (error) throw error;
const out = data.map((r) => ({ person: (r.people as unknown as { name: string }).name, photo_path: r.photo_path, embedding: r.embedding }));
writeFileSync('src/demo/embeddings.json', JSON.stringify(out));
console.log(`Exported ${out.length} embeddings.`);
