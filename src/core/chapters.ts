import type { LifeStage, Memory } from './types';

export const CHAPTER_ORDER: LifeStage[] = ['childhood', 'youth', 'marriage', 'work', 'parenthood', 'later', 'other', 'wishes'];

export const CHAPTER_TITLES: Record<LifeStage, string> = {
  childhood: 'Childhood', youth: 'Growing up', marriage: 'Marriage', work: 'Work',
  parenthood: 'Raising a family', later: 'Later years', other: 'Other stories', wishes: 'Wishes',
};

export interface Chapter { stage: LifeStage; title: string; memories: Memory[] }

/** Her life in chapters: each in order, the stories inside by year (unknown last), then by when they were told. */
export function groupIntoChapters(memories: Memory[]): Chapter[] {
  const by = new Map<LifeStage, Memory[]>();
  for (const m of memories) {
    const list = by.get(m.lifeStage) ?? [];
    list.push(m);
    by.set(m.lifeStage, list);
  }
  return CHAPTER_ORDER.flatMap((stage) => {
    const list = by.get(stage);
    if (!list?.length) return [];
    list.sort((a, b) => {
      if (a.yearFrom !== null && b.yearFrom !== null && a.yearFrom !== b.yearFrom) return a.yearFrom - b.yearFrom;
      if ((a.yearFrom === null) !== (b.yearFrom === null)) return a.yearFrom === null ? 1 : -1;
      return a.createdAt.localeCompare(b.createdAt);
    });
    return [{ stage, title: CHAPTER_TITLES[stage], memories: list }];
  });
}
