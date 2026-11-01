'use client';
import { Home, type RemiView } from '@/app/patient/[token]/screens/home';
import type { TodayData } from '@/app/patient/[token]/screens/today';

const noop = () => {};
const api = async () => new Response('{}', { headers: { 'content-type': 'application/json' } });
const remi: RemiView = { active: false, status: 'off', live: '', heard: '', reply: '', turns: [], listenNow: noop, say: noop, feel: noop };

export function TabletPreview({ night }: { night: boolean }) {
  const today: TodayData = {
    now: { weekday: 'Sunday', prettyDate: '1 November', prettyTime: night ? '8:40 pm' : '7:10 am', partOfDay: night ? 'evening' : 'morning', night },
    items: [{ id: '1', label: 'Morning tablets', kind: 'medicine', minutes: 8 * 60, state: 'upcoming', spokenMessage: null }],
  };
  return (
    <div className="tablet flex h-dvh min-h-[34rem] flex-col overflow-hidden" data-theme={night ? 'night' : 'day'} lang="en">
      <Home api={api} preferredName="Avni" language="en" today={today} go={noop} remi={remi} kodi={{ emotion: 'happy', cue: null, night }} onLanguage={noop} />
    </div>
  );
}
