import { labelsFor } from './labels';
import type { RemiStatus } from './use-remi';

/** One quiet line saying what Remi is doing. */
export function RemiStatusLine({ status, language, className = '' }: { status: RemiStatus; language: string; className?: string }) {
  const t = labelsFor(language);
  const text = {
    off: '', listening: t.remiListening, hearing: t.remiHearing, thinking: t.remiThinking, speaking: t.remiSpeaking,
    blocked: t.remiBlocked, unsupported: t.remiUnsupported,
  }[status];
  const dot = status === 'speaking' ? 'remi-dot bg-marigold'
    : status === 'listening' || status === 'hearing' || status === 'thinking' ? 'remi-dot bg-garden'
    : 'bg-stone-400';
  return (
    <p className={`flex items-center gap-3 text-lg text-ink/75 sm:text-xl ${className}`} role="status">
      <span aria-hidden className={`size-3.5 shrink-0 rounded-full ${dot}`} />
      {text}
    </p>
  );
}
