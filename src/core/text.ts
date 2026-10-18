export function stripReasoning(s: string): string {
  const withoutPairs = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const close = withoutPairs.toLowerCase().lastIndexOf('</think>');
  const rest = close >= 0 ? withoutPairs.slice(close + '</think>'.length) : withoutPairs;
  return rest.trim();
}
