// Sent with every page. Next.js writes small inline scripts of its own, so scripts can't be locked down further here.

export function securityHeaders(o: { dev: boolean; supabaseUrl?: string }): { key: string; value: string }[] {
  const supabase = o.supabaseUrl ?? '';
  const socket = supabase.replace(/^https:/, 'wss:');
  const face = 'https://cdn.jsdelivr.net'; // the face library and its models, for "Who is this?"
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${face}${o.dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase}`,
    `media-src 'self' data: blob: ${supabase}`,
    "font-src 'self' data:",
    `connect-src 'self' ${supabase} ${socket} ${face}${o.dev ? ' ws:' : ''}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // private links (a tablet, a letter, an invite) never travel to another site
    { key: 'Referrer-Policy', value: 'same-origin' },
    { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
  ];
}
