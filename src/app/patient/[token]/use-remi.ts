'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createListener, playClip, speakAsync, speechRecognitionCtor, type ListenerState } from '@/lib/speech';
import { classifyHeard, isDoneReply, shouldCheckIn, checkInLine, voiceCommand } from '@/core/listening';
import { speakableText, takeSentences } from '@/core/stream-speech';
import { detectSafetyWords } from '@/core/safety';
import { wakeReply, wellDoneMessage } from '@/core/messages';
import { kodiFeeling, type KodiCue, type KodiEmotion, type KodiEvent, type KodiGesture } from '@/core/kodi';
import { labelsFor } from './labels';
import type { Api } from './patient-app';

export type RemiStatus = 'off' | 'listening' | 'hearing' | 'thinking' | 'speaking' | 'blocked' | 'unsupported';
export type RemiPerson = { name: string; relation: string; isDeceased: boolean };
export type Turn = { you: string; remi: string };
type Screen = 'home' | 'talk' | 'face' | 'today';

const REMINDER_REPLY_MS = 90_000; // "done" counts as an answer to a reminder for this long
const SETTLE_MS = 800;            // live words unchanged this long = she has finished speaking

/** The orb listens for these instead of re-rendering on every word. */
export const REMI_BEAT = 'remi-beat';
const beat = (kind: 'word' | 'hear') => window.dispatchEvent(new CustomEvent(REMI_BEAT, { detail: kind }));

/**
 * Hands-free Remi: listens all the time, answers when addressed, joins in now and then,
 * speaks reminders and checks in after a long quiet spell. Replies stream in and are spoken
 * sentence by sentence.
 */
export function useRemi(o: {
  api: Api; language: string; preferredName: string; people: RemiPerson[];
  markDone: (id: string) => Promise<void>; go: (s: Screen, opts?: { autoLook?: boolean }) => void;
  /** The server has a natural cloud voice (Azure); otherwise Remi uses the browser's own voice. */
  cloudVoice?: boolean;
}) {
  const t = labelsFor(o.language);
  const [status, setStatus] = useState<RemiStatus>('off');
  // Kodi's feeling follows Avni's mood and what just happened; cues are one-off gestures
  const [emotion, setEmotion] = useState<KodiEmotion>('calm');
  const [cue, setCue] = useState<KodiCue>(null);
  const [idleLong, setIdleLong] = useState(false);
  // ?debug=1 shows what Remi heard and what it decided: the evidence when it seems not to respond
  const [trace, setTrace] = useState<{ at: string; heard: string; outcome: string }[]>([]);
  const note = useCallback((heard: string, outcome: string) => setTrace((tr) => [
    ...tr.slice(-7), { at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), heard, outcome },
  ]), []);
  const gesture = useCallback((g: KodiGesture) => setCue({ gesture: g, key: Date.now() + Math.random() }), []);
  const feel = useCallback((i: { mood?: string; reply?: string; event?: KodiEvent }) => {
    const f = kodiFeeling(i);
    setEmotion(f.emotion);
    if (f.gesture) gesture(f.gesture);
  }, [gesture]);
  const [live, setLive] = useState('');     // her words while she is speaking
  const [heard, setHeard] = useState('');   // her last finished words that Remi answered
  const [reply, setReply] = useState('');   // Remi's words, growing as they stream in
  const [turns, setTurns] = useState<Turn[]>([]);
  const listener = useRef<ReturnType<typeof createListener> | null>(null);
  const held = useRef(false);        // the Talk screen has the microphone
  const speaking = useRef(0);
  const busy = useRef(false);
  const armed = useRef(false);       // she tapped the orb: the next words are for Remi
  const lastSpokeAt = useRef(0);
  const lastActivity = useRef(0);    // set on start
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

  // One audio element, unlocked by the first tap: phones only let a page play sound after a touch.
  const player = useRef<HTMLAudioElement | null>(null);
  const fetchVoice = useCallback(async (text: string): Promise<Blob | null> => {
    try {
      const res = await latest.current.api('voice', { method: 'POST', body: JSON.stringify({ text, language: latest.current.language }) });
      return res.status === 200 ? await res.blob() : null;
    } catch {
      return null;
    }
  }, []);

  const speakNow = useCallback(async (text: string, show: boolean, clip?: Promise<Blob | null>) => {
    if (!text) return;
    speaking.current++;
    listener.current?.pause();
    setStatus((s) => (s === 'blocked' || s === 'off' || s === 'unsupported' ? s : 'speaking'));
    if (show) setReply(text);
    try {
      // the natural cloud voice when it's there; the browser's voice if it isn't or fails
      const audio = clip ? await clip : null;
      const played = audio && player.current ? await playClip(player.current, audio) : false;
      if (!played) await speakAsync(text, latest.current.language, undefined, { onWord: () => beat('word') });
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
  const enqueue = useCallback((text: string, show: boolean): Promise<void> => {
    // fetch the audio now, so the next sentence is ready while this one plays
    const clip = latest.current.cloudVoice && player.current ? fetchVoice(text) : undefined;
    const next = queue.current.then(() => speakNow(text, show, clip));
    queue.current = next.catch(() => {});
    return next;
  }, [speakNow, fetchVoice]);
  const say = useCallback((text: string) => enqueue(text, true), [enqueue]);

  /** Sends her words; speaks Remi's reply sentence by sentence as it streams in. Returns what Remi said. */
  const converse = useCallback(async (text: string, mode: 'addressed' | 'followup' | 'overheard'): Promise<{ text: string; mood?: string }> => {
    const res = await latest.current.api('talk', {
      method: 'POST',
      headers: { accept: 'application/x-ndjson' },
      body: JSON.stringify({ text, mode, language: latest.current.language }),
    });
    if (!res.body || !res.headers.get('content-type')?.includes('ndjson')) {
      const data = await res.json().catch(() => ({}));
      const answer = typeof data.reply === 'string' ? data.reply : '';
      if (answer) await say(answer);
      return { text: answer, mood: data.mood };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', raw = '', spokenUpTo = 0, shown = '';
    let final: { reply?: string | null; mood?: string } | null = null;
    const pump = (done: boolean) => {
      const speakable = speakableText(raw, done);
      if (speakable && speakable !== shown) { shown = speakable; setReply(speakable); }
      const { sentences, upTo } = takeSentences(speakable, spokenUpTo, done);
      spokenUpTo = upTo;
      for (const s of sentences) enqueue(s, false);
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (!line.trim()) continue;
        const msg = JSON.parse(line) as { delta?: string; done?: boolean; reply?: string | null; mood?: string };
        if (msg.delta) { raw += msg.delta; pump(false); }
        if (msg.done) final = msg;
      }
    }
    if (!final || final.reply == null) return { text: shown }; // silence (SKIP), or a stream that broke
    if (!raw) { await say(final.reply); return { text: final.reply, mood: final.mood }; } // fallback, clock, family words
    pump(true);
    await queue.current;
    return { text: shown, mood: final.mood };
  }, [enqueue, say]);

  const handle = useCallback(async (raw: string) => {
    const now = Date.now();
    lastActivity.current = now;
    setLive('');
    const { language, preferredName, markDone, go } = latest.current;

    const pending = pendingReminder.current;
    if (pending && now < pending.until && isDoneReply(raw)) {
      pendingReminder.current = null;
      setHeard(raw);
      await markDone(pending.id);
      feel({ event: 'reminder-done' });
      note(raw, 'reminder done');
      await say(wellDoneMessage(language, preferredName));
      return;
    }

    let h = classifyHeard(raw, { nowMs: now, lastSpokeAtMs: lastSpokeAt.current });
    if (armed.current && h.kind !== 'ignore') {
      armed.current = false;
      if (h.kind === 'followup' || h.kind === 'overheard') h = { kind: 'addressed', text: h.text };
    }
    if (h.kind === 'ignore') { idle(); return; }
    note(raw, h.kind === 'wake' ? 'wake word' : `${h.kind}`);
    if (h.kind === 'wake') { setHeard(raw); gesture('hop'); await say(wakeReply(language, preferredName)); return; }

    if (h.kind === 'addressed' || h.kind === 'followup') {
      const command = voiceCommand(h.text);
      if (command) {
        setHeard(h.text);
        go(command, { autoLook: command === 'face' });
        note(h.text, `command: ${command}`);
        if (command === 'face') await say(t.looking2);
        if (command === 'today') await say(t.yourDay);
        return;
      }
    }

    // One question at a time; but a cry for help never waits.
    if (busy.current && !detectSafetyWords(raw).length) { note(raw, 'dropped: still answering'); return; }
    busy.current = true;
    const previous = { you: heard, remi: reply };
    if (h.kind === 'addressed') { setHeard(h.text); setReply(''); setStatus('thinking'); }
    try {
      const result = await converse(h.text, h.kind);
      const answer = result.text;
      note(h.text, answer ? `replied (${h.kind})` : `stayed quiet (${h.kind})`);
      if (answer) {
        feel({ mood: result.mood, reply: answer });
        if (h.kind !== 'addressed') setHeard(h.text);
        if (previous.remi) setTurns((ts) => [...ts, previous].slice(-3));
      } else if (h.kind === 'addressed') {
        await say(t.retry);
      }
    } catch (e) {
      note(h.text, `error: ${(e as Error).message}`);
      if (h.kind === 'addressed') await say(t.retry);
    } finally {
      busy.current = false;
      if (!speaking.current) idle();
    }
  }, [say, converse, idle, t, heard, reply, feel, gesture, note]);

  const handleRef = useRef(handle);
  useEffect(() => { handleRef.current = handle; }, [handle]);

  /** Always-on listening in the current language; null where the browser can't listen. */
  const makeListener = useCallback(() => {
    const Ctor = speechRecognitionCtor(window);
    if (!Ctor) return null;
    return createListener(Ctor, {
      lang: latest.current.language,
      settleMs: SETTLE_MS,
      onText: (text) => { handleRef.current(text); },
      onInterim: (text) => {
        setLive(text);
        beat('hear');
        setStatus((s) => (s === 'listening' ? 'hearing' : s));
      },
      onState: (s: ListenerState) => { if (s === 'blocked') setStatus('blocked'); },
    });
  }, []);

  /** Needs a tap: browsers allow the microphone and sound only after one. */
  const start = useCallback(async () => {
    if (latest.current.cloudVoice && !player.current) {
      player.current = new Audio();
      player.current.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      player.current.play().catch(() => {}); // this tap unlocks sound for the rest of the visit
    }
    listener.current = makeListener();
    if (listener.current) {
      listener.current.start();
      setStatus('listening');
    } else {
      setStatus('unsupported');
    }
    lastActivity.current = lastCheckIn.current = Date.now();
    // ?quiet=<minutes> shortens the check-in wait, for demos.
    const quiet = Number(new URLSearchParams(window.location.search).get('quiet'));
    checkInAfterMs.current = quiet > 0 ? quiet * 60_000 : undefined;
    feel({ event: 'greeting' });
    await say(t.intro(latest.current.preferredName));
  }, [say, t, feel, makeListener]);

  // A new language from the 🌐 button: listen in it from now on.
  useEffect(() => {
    if (!listener.current) return;
    listener.current.stop();
    listener.current = makeListener();
    listener.current?.start();
    if (speaking.current || held.current) listener.current?.pause();
  }, [o.language, makeListener]);

  /** She tapped the orb: whatever she says next is for Remi, no name needed. */
  const listenNow = useCallback(() => {
    if (!listener.current || speaking.current) return;
    armed.current = true;
    lastSpokeAt.current = Date.now();
    setReply('');
    setHeard('');
    setStatus((s) => (s === 'blocked' ? s : 'hearing'));
  }, []);

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
      setIdleLong(now - lastActivity.current > 5 * 60_000); // a long quiet spell: Kodi gets drowsy at night
      if (held.current || speaking.current || busy.current) return;
      if (!shouldCheckIn({
        nowMs: now, lastActivityMs: lastActivity.current, lastCheckInMs: lastCheckIn.current,
        minutesOfDay: d.getHours() * 60 + d.getMinutes(), afterMs: checkInAfterMs.current,
      })) return;
      lastCheckIn.current = now;
      feel({ event: 'greeting' });
      say(checkInLine(language, preferredName, people, checkIns.current++));
    }, 15_000);
    return () => clearInterval(id);
  }, [status, say, feel]);

  useEffect(() => () => listener.current?.stop(), []);

  return {
    status, live, heard, reply, turns, start, say, announce, hold, listenNow,
    active: status !== 'off',
    emotion, cue, idleLong, feel, gesture, trace,
  };
}
