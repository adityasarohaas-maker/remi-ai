// Records her side of a conversation while the browser's speech recognition listens.
// The microphone is shared: one stream for the whole visit, started on the first turn.
// Nothing here throws: a tablet that cannot record still talks.

type Env = {
  getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>;
  MediaRecorder?: typeof MediaRecorder;
};

function browserEnv(): Env {
  if (typeof navigator === 'undefined' || typeof MediaRecorder === 'undefined') return {};
  const md = navigator.mediaDevices;
  return { getUserMedia: md ? (c) => md.getUserMedia(c) : undefined, MediaRecorder };
}

export function createRecorder(env: Env = browserEnv()) {
  let stream: MediaStream | null = null;
  let rec: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let mime = 'audio/webm';

  async function mic(): Promise<MediaStream | null> {
    if (stream) return stream;
    if (!env.getUserMedia || !env.MediaRecorder) return null;
    try {
      stream = await env.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      return stream;
    } catch {
      return null;
    }
  }

  return {
    /** Starts a clip; false when this browser cannot record (talk carries on without audio). */
    async start(): Promise<boolean> {
      if (rec && rec.state === 'recording') return true;
      const s = await mic();
      if (!s || !env.MediaRecorder) return false;
      try {
        const Rec = env.MediaRecorder;
        const supports = (t: string) => typeof Rec.isTypeSupported === 'function' && Rec.isTypeSupported(t);
        mime = supports('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : supports('audio/mp4') ? 'audio/mp4' : '';
        rec = mime ? new Rec(s, { mimeType: mime }) : new Rec(s);
        chunks = [];
        rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
        rec.start(1000); // a chunk a second, so a crash loses at most that
        return true;
      } catch {
        rec = null;
        return false;
      }
    },
    /** Ends the clip and hands back its audio; null when nothing was recorded. */
    stop(): Promise<Blob | null> {
      const r = rec;
      rec = null;
      if (!r || r.state === 'inactive') return Promise.resolve(null);
      return new Promise((resolve) => {
        const finish = () => {
          const type = r.mimeType || mime || 'audio/webm';
          resolve(chunks.length ? new Blob(chunks, { type }) : null);
          chunks = [];
        };
        r.onstop = finish;
        r.onerror = finish;
        try { r.stop(); } catch { finish(); }
      });
    },
    /** Ends the clip and throws it away: speech Remi ignored is never kept. */
    discard(): void {
      const r = rec;
      rec = null;
      chunks = [];
      if (r && r.state !== 'inactive') { r.ondataavailable = null; r.onstop = null; try { r.stop(); } catch { /* already stopped */ } }
    },
    recording(): boolean { return !!rec && rec.state === 'recording'; },
  };
}
export type Recorder = ReturnType<typeof createRecorder>;
