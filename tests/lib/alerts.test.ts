import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { formatAlertMessage } from '@/lib/alerts';

describe('formatAlertMessage', () => {
  it('labels the reason and includes the detail', () => {
    const m = formatAlertMessage('Avni', 'safety', 'Avni said: "I fell"');
    expect(m).toContain('Avni');
    expect(m).toContain('Safety words heard');
    expect(m).toContain('I fell');
  });
});
