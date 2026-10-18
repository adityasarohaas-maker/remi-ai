// Reasoning models may put their thinking in the reply. Never let any of it reach the patient:
// drop complete <think> blocks, anything before a stray </think>, and anything after an
// unclosed <think> (a reply cut off by max_tokens mid-thought).
export function stripReasoning(s: string): string {
  const withoutPairs = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const close = withoutPairs.toLowerCase().lastIndexOf('</think>');
  const afterClose = close >= 0 ? withoutPairs.slice(close + '</think>'.length) : withoutPairs;
  const open = afterClose.toLowerCase().indexOf('<think>');
  return (open >= 0 ? afterClose.slice(0, open) : afterClose).trim();
}
