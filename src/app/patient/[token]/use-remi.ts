'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createListener, playClip, speakAsync, speechRecognitionCtor, type ListenerState } from '@/lib/speech';
import { classifyHeard, isBargeIn, isDoneReply, isEcho, isStopOnly, shouldCheckIn, checkInLine, voiceCommand } from '@/core/listening';
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
const SETTLE_MS = 500;            // live words unchanged this long = she has finished speaking

/** The orb listens for these instead of re-rendering on every word. */
export const REMI_BEAT = 'remi-beat';
const beat = (kind: 'word' | 'hear') => window.dispatchEvent(new CustomEvent(REMI_BEAT, { detail: kind }));
/** A clip of Remi's voice that came inside the reply stream (base64). */
const mp3 = (base64: string) => new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: 'audio/mpeg' });

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
  const micBlocked = useRef(false);  // the listener gave up; a tap on Kodi starts a new one
  const speaking = useRef(0);
  const busy = useRef(false);
  const armed = useRef(false);       // she tapped the orb: the next words are for Remi
  // Barge-in: the microphone stays on while Remi speaks, so she can talk over Remi to stop it.
  // What Remi said lately tells her words apart from Remi's own voice coming back. ?bargein=0 turns it off.
  const bargeIn = useRef(true);
  const echo = useRef<string[]>([]);
  const talkAbort = useRef<AbortController | null>(null);
  const asking = useRef('');          // what she asked for the reply in progress
  const lastSpokeAt = useRef(0);
  const lastWarm = useRef(0);
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
      // never wait forever: a stuck clip would keep the microphone paused
      const res = await latest.current.api('voice', {
        method: 'POST', body: JSON.stringify({ text, language: latest.current.language }), signal: AbortSignal.timeout(8000),
      });
      return res.status === 200 ? await res.blob() : null;
    } catch {
      return null;
    }
  }, []);

  // Each interruption starts a new turn; anything queued for an older turn is dropped.
  const turn = useRef(0);

  // Captions follow the voice: a reply's words appear sentence by sentence as Remi says them.
  const freshCaption = useRef(true);
  const speakNow = useCallback(async (text: string, show: boolean | 'append', clip?: Promise<Blob | null>, forTurn = turn.current) => {
    if (!text || forTurn !== turn.current) return;
    speaking.current++;
    if (!bargeIn.current) listener.current?.pause();
    try {
      // the natural cloud voice when it's there; the browser's voice if it isn't or fails
      const audio = clip ? await clip : null;
      if (forTurn !== turn.current) return; // she cut in while the clip was on its way
      echo.current = [...echo.current.slice(-3), text];
      setStatus((s) => (s === 'blocked' || s === 'off' || s === 'unsupported' ? s : 'speaking'));
      if (show === 'append' && !freshCaption.current) setReply((r) => (r ? `${r} ${text}` : text));
      else if (show) { setReply(text); freshCaption.current = false; }
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
  const enqueue = useCallback((text: string, show: boolean | 'append', ready?: Blob | null): Promise<void> => {
    // audio that came with the reply plays as is; otherwise fetch it now, so it's ready when its turn comes
    const clip = ready !== undefined ? Promise.resolve(ready)
      : latest.current.cloudVoice && player.current ? fetchVoice(text) : undefined;
    const forTurn = turn.current;
    const next = queue.current.then(() => speakNow(text, show, clip, forTurn));
    queue.current = next.catch(() => {});
    return next;
  }, [speakNow, fetchVoice]);
  const say = useCallback((text: string) => enqueue(text, true), [enqueue]);

  /** Sends her words; speaks Remi's reply sentence by sentence as it streams in. Returns what Remi said. */
  const converse = useCallback(async (text: string, mode: 'addressed' | 'followup' | 'overheard'): Promise<{ text: string; mood?: string }> => {
    // With the cloud voice, the server voices the reply as it writes it and sends words and audio together.
    const voice = latest.current.cloudVoice && !!player.current;
    // she can cut in at any moment: interrupt() aborts this reply, and what Remi already said stands
    const ctrl = new AbortController();
    talkAbort.current = ctrl;
    const said: string[] = [];
    try {
      return await streamReply(ctrl.signal);
    } catch (e) {
      if (ctrl.signal.aborted) return { text: said.join(' ') };
      throw e;
    } finally {
      if (talkAbort.current === ctrl) talkAbort.current = null;
    }

    async function streamReply(signal: AbortSignal): Promise<{ text: string; mood?: string }> {
      const res = await latest.current.api('talk', {
        method: 'POST',
        headers: { accept: 'application/x-ndjson' },
        body: JSON.stringify({ text, mode, language: latest.current.language, voice }),
        signal,
      });
      freshCaption.current = true;
      if (!res.body || !res.headers.get('content-type')?.includes('ndjson')) {
        const data = await res.json().catch(() => ({}));
        const answer = typeof data.reply === 'string' ? data.reply : '';
        if (answer) await say(answer);
        return { text: answer, mood: data.mood };
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', raw = '', spokenUpTo = 0;
      let final: { reply?: string | null; mood?: string } | null = null;
      const myTurn = turn.current;
      const speak = (s: string, audio?: Blob | null) => {
        if (turn.current !== myTurn) return; // she interrupted: the rest of this reply goes unsaid
        said.push(s);
        enqueue(s, 'append', audio);
      };
      const pump = (done: boolean) => {
        const { sentences, upTo } = takeSentences(speakableText(raw, done), spokenUpTo, done, { firstPhrase: true });
        spokenUpTo = upTo;
        for (const s of sentences) speak(s);
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
          const msg = JSON.parse(line) as { delta?: string; say?: string; audio?: string; done?: boolean; reply?: string | null; mood?: string };
          if (msg.say) speak(msg.say, msg.audio ? mp3(msg.audio) : null);
          if (msg.delta) { raw += msg.delta; pump(false); }
          if (msg.done) final = msg;
        }
      }
      if (!final || final.reply == null) { await queue.current; return { text: said.join(' ') }; } // silence (SKIP), or a broken stream
      // fallback, clock, family words: no stream to speak from (the server voices these too when it can)
      if (!said.length && !raw) { await say(final.reply); return { text: final.reply, mood: final.mood }; }
      if (raw) pump(true);
      await queue.current;
      return { text: said.join(' '), mood: final.mood };
    }
  }, [enqueue, say]);

  /** She cut in (by voice or a tap): Remi stops mid-sentence, drops the rest of the reply, and listens. */
  const interrupt = useCallback(() => {
    turn.current++;
    talkAbort.current?.abort();
    window.speechSynthesis?.cancel();
    if (player.current && !player.current.paused) {
      player.current.pause();
      player.current.onended?.(new Event('ended'));
    }
  }, []);

  /** Did that come from her, or is it Remi's own voice heard back through the speaker? */
  const fromHer = useCallback((text: string) => {
    if (!bargeIn.current) return true;
    const spoken = echo.current.join(' ');
    if (speaking.current) return isBargeIn(text, spoken);
    // the last words can still arrive just after Remi stops
    return Date.now() - lastSpokeAt.current > 2000 || isBargeIn(text, spoken) || !isEcho(text, spoken);
  }, []);

  const handle = useCallback(async (raw: string) => {
    const now = Date.now();
    if (!fromHer(raw)) { note(raw, 'echo of Remi'); return; }
    lastActivity.current = now;
    setLive('');
    const { language, preferredName, markDone, go } = latest.current;

    if (speaking.current || busy.current) {
      // she talked over Remi: stop, and answer her instead
      if (isStopOnly(raw)) { interrupt(); note(raw, 'stopped by voice'); setReply(''); setStatus('hearing'); armed.current = true; return; }
      // still thinking, nothing said yet: she was adding to what she'd asked, so answer all of it
      if (busy.current && !speaking.current && asking.current) raw = `${asking.current} ${raw}`;
      interrupt();
      armed.current = true;
      for (let i = 0; i < 40 && busy.current; i++) await new Promise((r) => setTimeout(r, 50)); // the old reply winds down
    }

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
    asking.current = h.text;
    const previous = { you: heard, remi: reply };
    // a reply to Remi gets the same instant 'thinking' as its name does: she sees she was heard
    if (h.kind !== 'overheard') { setHeard(h.text); setReply(''); setStatus('thinking'); }
    const startTurn = turn.current;
    try {
      const result = await converse(h.text, h.kind);
      if (turn.current !== startTurn) { note(h.text, 'interrupted'); return; } // she cut in; her new words get the answer
      const answer = result.text;
      note(h.text, answer ? `replied (${h.kind})` : `stayed quiet (${h.kind})`);
      if (answer) {
        feel({ mood: result.mood, reply: answer });
        if (h.kind !== 'addressed') setHeard(h.text);
        if (previous.remi) setTurns((ts) => [...ts, previous].slice(-3));
      } else if (h.kind === 'addressed') {
        await say(t.retry);
      } else if (h.kind === 'followup') {
        setHeard(''); // it wasn't for Remi after all
      }
    } catch (e) {
      note(h.text, `error: ${(e as Error).message}`);
      if (h.kind === 'addressed' && turn.current === startTurn) await say(t.retry);
    } finally {
      busy.current = false;
      if (!speaking.current) idle();
    }
  }, [say, converse, idle, t, heard, reply, feel, gesture, note, fromHer, interrupt]);

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
        if (!fromHer(text)) return; // Remi hearing itself
        if (speaking.current) { interrupt(); armed.current = true; setReply(''); } // she talked over Remi: stop now
        // she has started speaking: wake the reply and voice servers now, so they're warm when she finishes
        if (Date.now() - lastWarm.current > 20_000) {
          lastWarm.current = Date.now();
          latest.current.api('talk', { method: 'GET' }).catch(() => {});
          if (latest.current.cloudVoice) latest.current.api('voice', { method: 'GET' }).catch(() => {});
        }
        setLive(text);
        beat('hear');
        setStatus((s) => (s === 'listening' ? 'hearing' : s));
      },
      onState: (s: ListenerState) => {
        micBlocked.current = s === 'blocked';
        if (s === 'blocked') setStatus('blocked');
      },
    });
  }, [fromHer, interrupt]);

  /** Needs a tap: browsers allow the microphone and sound only after one. */
  const start = useCallback(async () => {
    if (latest.current.cloudVoice && !player.current) {
      player.current = new Audio();
      player.current.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      player.current.play().catch(() => {}); // this tap unlocks sound for the rest of the visit
    }
    bargeIn.current = new URLSearchParams(window.location.search).get('bargein') !== '0';
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

  const listenNow = useCallback(() => {
    if (!listener.current) return;
    if (speaking.current) interrupt();
    if (micBlocked.current) {
      // the microphone gave up: this tap lets the browser ask for it again
      micBlocked.current = false;
      listener.current.stop();
      listener.current = makeListener();
      listener.current?.start();
    }
    armed.current = true;
    lastSpokeAt.current = Date.now();
    setReply('');
    setHeard('');
    setStatus('hearing');
  }, [interrupt, makeListener]);

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
