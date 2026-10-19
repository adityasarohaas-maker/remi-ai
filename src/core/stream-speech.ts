// Speaking a reply while it is still being written: Remi starts talking after the first sentence
// instead of waiting for the whole reply. The model's hidden lines (MOOD:, TELL_FAMILY:) and SKIP
// must never be spoken, even half-written.

const TAGS = ['MOOD:', 'TELL_FAMILY:'];
const tagKey = (line: string) => line.replace(/^\s*\[?\s*/, '').toUpperCase();
const isTag = (line: string) => TAGS.some((t) => tagKey(line).startsWith(t));
const mayBecomeTag = (line: string) => {
  const k = tagKey(line);
  return k === '' || TAGS.some((t) => t.startsWith(k) || k.startsWith(t));
};

function withoutReasoning(raw: string, done: boolean): string {
  let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const close = s.toLowerCase().lastIndexOf('</think>');
  if (close >= 0) s = s.slice(close + '</think>'.length);
  const open = s.toLowerCase().indexOf('<think>');
  if (open >= 0) s = s.slice(0, open);
  if (!done) s = s.replace(/<\/?t?h?i?n?k?$/i, ''); // a tag still arriving
  return s;
}

/** The part of a (possibly unfinished) reply that may be spoken. */
export function speakableText(raw: string, done: boolean): string {
  let visible = withoutReasoning(raw, done);
  // Hidden lines always come after the reply, sometimes on the same line: nothing after one is spoken.
  const tag = visible.search(/\[?\s*(?:MOOD|TELL_FAMILY)\s*:/i);
  if (tag >= 0) visible = visible.slice(0, tag);
  const lines = visible.split('\n');
  const last = lines.length - 1;
  const kept = lines.filter((line, i) => !isTag(line) && (done || i < last || !mayBecomeTag(line) || line.trim() === ''));
  const text = kept.join('\n').trim();
  const upper = text.toUpperCase();
  if (/^SKIP\b/.test(upper) || (!done && 'SKIP'.startsWith(upper))) return '';
  return text;
}

// A sentence ends at . ! ? । or … (plus closing quotes) followed by whitespace.
const SENTENCE = /[^.!?।…]*[.!?।…]+["'”’)]*(?=\s)/y;

/**
 * Finished sentences in text after `from`; when `done`, the rest too.
 * firstPhrase: before the first full sentence exists, let an opening phrase of 4+ words go at a
 * comma or dash ("Oh, how lovely that sounds,"), so Remi starts talking while the rest is written.
 */
export function takeSentences(text: string, from: number, done: boolean, o: { firstPhrase?: boolean } = {}): { sentences: string[]; upTo: number } {
  const sentences: string[] = [];
  let upTo = from;
  for (;;) {
    SENTENCE.lastIndex = upTo;
    const m = SENTENCE.exec(text);
    if (!m) break;
    const s = m[0].trim();
    if (s) sentences.push(s);
    upTo = SENTENCE.lastIndex;
    while (upTo < text.length && /\s/.test(text[upTo])) upTo++;
  }
  if (o.firstPhrase && from === 0 && sentences.length === 0 && !done) {
    for (const m of text.matchAll(/[,;:—–](?=\s)|[，、]/g)) {
      const end = (m.index ?? 0) + m[0].length;
      const phrase = text.slice(0, end).trim();
      const long = /[，、]/.test(m[0]) ? phrase.length >= 6 : phrase.split(/\s+/).length >= 4;
      if (!long) continue;
      sentences.push(phrase);
      upTo = end;
      while (upTo < text.length && /\s/.test(text[upTo])) upTo++;
      break;
    }
  }
  if (done && upTo < text.length) {
    const rest = text.slice(upTo).trim();
    if (rest) sentences.push(rest);
    upTo = text.length;
  }
  return { sentences, upTo };
}
