export type NoteBlock = { kind: 'heading'; text: string } | { kind: 'para'; text: string } | { kind: 'list'; items: string[] };

const HEADINGS = ['how the day went', 'questions asked most', 'medicines and meals', 'anything to watch'];
const unbold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1');

// Evening notes are plain text from Nemotron or the facts-only writer; give them structure without trusting HTML.
export function noteBlocks(summary: string): NoteBlock[] {
  const out: NoteBlock[] = [];
  for (const raw of summary.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      const last = out[out.length - 1];
      const item = unbold(bullet[1]).trim();
      if (last?.kind === 'list') last.items.push(item);
      else out.push({ kind: 'list', items: [item] });
      continue;
    }
    const md = line.match(/^#{1,6}\s+(.*)$/) ?? line.match(/^\*\*([^*]+)\*\*:?$/);
    const plain = unbold(md ? md[1] : line).replace(/:\s*$/, '').trim();
    if (md || HEADINGS.includes(plain.toLowerCase())) out.push({ kind: 'heading', text: plain });
    else out.push({ kind: 'para', text: unbold(line) });
  }
  return out;
}
