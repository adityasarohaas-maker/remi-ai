import { describe, it, expect } from 'vitest';
import { newDeviceToken, hashDeviceToken } from '@/lib/device-token';

describe('device tokens', () => {
  it('are long, url-safe and unique', () => {
    const a = newDeviceToken(); const b = newDeviceToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(b);
  });
  it('hash deterministically to 64 hex chars', () => {
    expect(hashDeviceToken('abc')).toBe(hashDeviceToken('abc'));
    expect(hashDeviceToken('abc')).toMatch(/^[0-9a-f]{64}$/);
  });
});
