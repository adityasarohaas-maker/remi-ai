import { describe, it, expect } from 'vitest';
import { PRODUCT_NAME, demoButtonShown, DEMO_BUTTON_UNTIL } from '@/core/brand';

describe('brand', () => {
  it('names the product once', () => { expect(PRODUCT_NAME).toBe('Remi'); });
  it('shows the demo button through the YC window, then not', () => {
    expect(demoButtonShown(new Date('2026-10-31T12:00:00Z'))).toBe(true);
    expect(demoButtonShown(new Date('2026-12-31T23:59:59Z'))).toBe(true);
    expect(demoButtonShown(DEMO_BUTTON_UNTIL)).toBe(false);
  });
});
