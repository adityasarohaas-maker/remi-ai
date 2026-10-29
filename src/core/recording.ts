// Her voice, one clip per turn: the rules for what the tablet may upload and where it goes.
export const MAX_CLIP_BYTES = 2_000_000;
export const MAX_CLIP_MS = 90_000;
export const ALLOWED_MIME = ['audio/webm', 'audio/ogg', 'audio/mp4'] as const;
export const RECORDINGS_PER_MIN = 30;

/** `{household}/{yyyy-mm-dd}/{id}.webm`, the day in UTC so a path never depends on a timezone. */
export function clipPath(householdId: string, now: Date, id: string): string {
  return `${householdId}/${now.toISOString().slice(0, 10)}/${id}.webm`;
}

export function validateClip(mime: string, bytes: number): 'ok' | 'too_big' | 'bad_type' {
  const base = mime.split(';')[0].trim().toLowerCase();
  if (!(ALLOWED_MIME as readonly string[]).includes(base)) return 'bad_type';
  if (bytes > MAX_CLIP_BYTES) return 'too_big';
  return 'ok';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** The tablet names each clip before uploading it, so the talk request can carry the id straight away. */
export function isUuid(s: unknown): s is string {
  return typeof s === 'string' && UUID.test(s);
}
