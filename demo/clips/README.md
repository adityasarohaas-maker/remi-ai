# Demo clips

One audio file per demo memory, named by its `key` in `src/demo/memories.json`:

```
demo/clips/wedding-day.mp3
demo/clips/rose-garden.m4a
```

Accepted: `.mp3`, `.m4a`, `.webm`, `.ogg`. A file you record yourself wins over a generated one.

- `npm run demo:clips` makes the missing ones with the Azure voice (`AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` in `.env.local`) and prints how many were generated and how many are yours.
- `npm run seed:demo` uploads whatever is here to the `voice` bucket under `demo/clips/` and points the demo memories at them. Files already in the bucket are left alone, so the nightly reset on Vercel (which has no `demo/` folder) keeps using them.

Audio files in this folder are not committed.
