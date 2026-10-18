'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createListener, speakAsync, speechRecognitionCtor, type ListenerState } from '@/lib/speech';
import { classifyHeard, isDoneReply, shouldCheckIn, checkInLine, voiceCommand } from '@/core/listening';
import { detectSafetyWords } from '@/core/safety';
import { wakeReply, wellDoneMessage } from '@/core/messages';
import { labelsFor } from './labels';
import type { Api } from './patient-app';

export type RemiStatus = 'off' | 'listening' | 'thinking' | 'speaking' | 'blocked' | 'unsupported';
export type RemiPerson = { name: string; relation: string; isDeceased: boolean };
type Screen = 'home' | 'talk' | 'face' | 'today';

const REMINDER_REPLY_MS = 90_000; // "done" counts as an answer to a reminder for this long

/**
 * Hands-free Remi: listens all the time, answers when addressed, joins in now and then,
 * speaks reminders and checks in after a long quiet spell.
 */
export function useRemi(o: {
  api: Api; language: string; preferredName: string; people: RemiPerson[];
  markDone: (id: string) => Promise<void>; go: (s: Screen, opts?: { autoLook?: boolean }) => void;
}) {
  const t = labelsFor(o.language);
  const [status, setStatus] = useState<RemiStatus>('off');
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const listener = useRef<ReturnType<typeof createListener> | null>(null);
  const held = useRef(false);        // the Talk screen has the microphone
  const speaking = useRef(0);        // nested says
  const busy = useRef(false);
  const lastSpokeAt = useRef(0);
  const lastActivity = useRef(0);   // set on start
  const lastCheckIn = useRef(0);
  const checkInAfterMs = useRef<number | undefined>(undefined);
  const checkIns = useRef(0);
  const pendingReminder = useRef<{ id: string; until: number } | null>(null);
  const latest = useRef(o);
  useEffect(() => { latest.current = o; });

  const idle = useCallback(() => {
    if (!listener.current) return;
    setStatus((s) => (s === 'blocked' ? s : 'listening'));
  }, []);

  const speakNow = useCallback(async (text: string) => {
    if (!text) return;
    speaking.current++;
    listener.current?.pause();
    setStatus((s) => (s === 'blocked' || s === 'off' || s === 'unsupported' ? s : 'speaking'));
    setReply(text);
    try {
      await speakAsync(text, latest.current.language);
    } finally {
      lastSpokeAt.current = Date.now();
      if (--speaking.current === 0) {
        if (!held.current) listener.current?.resume();
        idle();
      }
    }
  }, [idle]);

  /** Remi's voice. One thing at a time, and the listener pauses so Remi never hears itself. */
  const queue = useRef<Promise<void>>(Promise.resolve());
  const say = useCallback((text: string): Promise<void> => {
    const next = queue.current.then(() => speakNow(text));
    queue.current = next.catch(() => {});
    return next;
  }, [speakNow]);

  const handle = useCallback(async (raw: string) => {
    const now = Date.now();
    lastActivity.current = now;
    const { api, language, preferredName, markDone, go } = latest.current;

    const pending = pendingReminder.current;
    if (pending && now < pending.until && isDoneReply(raw)) {
      pendingReminder.current = null;
      setHeard(raw);
      await markDone(pending.id);
      await say(wellDoneMessage(language, preferredName));
      return;
    }

    const h = classifyHeard(raw, { nowMs: now, lastSpokeAtMs: lastSpokeAt.current });
    if (h.kind === 'ignore') return;
    if (h.kind === 'wake') { setHeard(raw); await say(wakeReply(language, preferredName)); return; }

    if (h.kind === 'addressed' || h.kind === 'followup') {
      const command = voiceCommand(h.text);
      if (command) {
        setHeard(h.text);
        go(command, { autoLook: command === 'face' });
        if (command === 'face') await say(t.looking2);
        if (command === 'today') await say(t.yourDay);
        return;
      }
    }

    // One question at a time; but a cry for help never waits.
    if (busy.current && !detectSafetyWords(raw).length) return;
    busy.current = true;
    if (h.kind === 'addressed') { setHeard(h.text); setStatus('thinking'); }
    try {
      const res = await api('talk', { method: 'POST', body: JSON.stringify({ text: h.text, mode: h.kind }) });
      const data = await res.json().catch(() => ({}));
      const answer = typeof data.reply === 'string' ? data.reply : h.kind === 'addressed' ? t.retry : '';
      if (answer) {
        if (h.kind !== 'addressed') setHeard(h.text);
        await say(answer);
      }
    } catch {
      if (h.kind === 'addressed') await say(t.retry);
    } finally {
      busy.current = false;
      if (!speaking.current) idle();
    }
  }, [say, idle, t]);

  const handleRef = useRef(handle);
  useEffect(() => { handleRef.current = handle; }, [handle]);

  /** Needs a tap: browsers allow the microphone and sound only after one. */
  const start = useCallback(async () => {
    const Ctor = speechRecognitionCtor(window);
    if (Ctor) {
      listener.current = createListener(Ctor, {
        lang: latest.current.language,
        onText: (text) => { handleRef.current(text); },
        onState: (s: ListenerState) => { if (s === 'blocked') setStatus('blocked'); },
      });
      listener.current.start();
      setStatus('listening');
    } else {
      setStatus('unsupported');
    }
    lastActivity.current = lastCheckIn.current = Date.now();
    // ?quiet=<minutes> shortens the check-in wait, for demos.
    const quiet = Number(new URLSearchParams(window.location.search).get('quiet'));
    checkInAfterMs.current = quiet > 0 ? quiet * 60_000 : undefined;
    await say(t.intro(latest.current.preferredName));
  }, [say, t]);

  /** A routine item became due: say it, and listen for "done". */
  const announce = useCallback((item: { id: string; text: string }) => {
    pendingReminder.current = { id: item.id, until: Date.now() + REMINDER_REPLY_MS };
    lastActivity.current = Date.now();
    return say(item.text);
  }, [say]);

  /** The Talk screen uses its own one-shot listening; step aside while it is open. */
  const hold = useCallback((on: boolean) => {
    held.current = on;
    if (on) listener.current?.pause();
    else if (!speaking.current) { listener.current?.resume(); idle(); }
  }, [idle]);

  // Check in after a long quiet spell during the day.
  useEffect(() => {
    if (status === 'off') return;
    const id = setInterval(() => {
      const now = Date.now();
      const d = new Date(now);
      const { language, preferredName, people } = latest.current;
      if (held.current || speaking.current || busy.current) return;
      if (!shouldCheckIn({
        nowMs: now, lastActivityMs: lastActivity.current, lastCheckInMs: lastCheckIn.current,
        minutesOfDay: d.getHours() * 60 + d.getMinutes(), afterMs: checkInAfterMs.current,
      })) return;
      lastCheckIn.current = now;
      say(checkInLine(language, preferredName, people, checkIns.current++));
    }, 15_000);
    return () => clearInterval(id);
  }, [status, say]);

  useEffect(() => () => listener.current?.stop(), []);

  return { status, heard, reply, start, say, announce, hold, active: status !== 'off' };
}
