import { describe, it, expect } from 'vitest';
import { noteBlocks } from '@/core/note-blocks';

describe('noteBlocks', () => {
  it('turns known headings, markdown headings and bold lines into headings', () => {
    const b = noteBlocks('How the day went\nCalm.\n\n## Questions asked most\n- “what day is it” (2 times)\n**Anything to watch**\nNothing.');
    expect(b).toEqual([
      { kind: 'heading', text: 'How the day went' },
      { kind: 'para', text: 'Calm.' },
      { kind: 'heading', text: 'Questions asked most' },
      { kind: 'list', items: ['“what day is it” (2 times)'] },
      { kind: 'heading', text: 'Anything to watch' },
      { kind: 'para', text: 'Nothing.' },
    ]);
  });

  it('groups consecutive bullets and strips inline bold markers', () => {
    expect(noteBlocks('* one\n- **two**\n• three')).toEqual([{ kind: 'list', items: ['one', 'two', 'three'] }]);
  });

  it('keeps a heading followed by a colon', () => {
    expect(noteBlocks('Medicines and meals:\nAll taken.')[0]).toEqual({ kind: 'heading', text: 'Medicines and meals' });
  });
});
