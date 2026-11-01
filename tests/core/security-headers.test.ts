import { describe, it, expect } from 'vitest';
import { securityHeaders } from '@/core/security-headers';

const get = (dev: boolean) => Object.fromEntries(securityHeaders({ dev, supabaseUrl: 'https://abc.supabase.co' }).map((h) => [h.key, h.value]));

describe('securityHeaders', () => {
  it('stops framing, sniffing and leaking private links', () => {
    const h = get(false);
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('same-origin');
    expect(h['Permissions-Policy']).toContain('microphone=(self)');
    expect(h['Permissions-Policy']).toContain('camera=(self)');
  });
  it('allows only what the app really talks to', () => {
    const csp = get(false)['Content-Security-Policy'];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain('https://abc.supabase.co');
    expect(csp).toContain('wss://abc.supabase.co');
    expect(csp).toContain('https://cdn.jsdelivr.net');
    expect(csp).not.toContain("'unsafe-eval'");
  });
  it('lets the dev server evaluate its own code', () => {
    expect(get(true)['Content-Security-Policy']).toContain("'unsafe-eval'");
  });
});
