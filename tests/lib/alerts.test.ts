import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { formatAlertMessage } from '@/lib/alerts';

describe('formatAlertMessage', () => {
  it('labels the reason and includes the detail', () => {
    const m = formatAlertMessage('Kamla', 'safety', 'Kamla said: "I fell"');
    expect(m).toContain('Kamla');
    expect(m).toContain('Safety words heard');
    expect(m).toContain('I fell');
  });
});
