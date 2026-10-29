/** The product's name, in one place. */
export const PRODUCT_NAME = 'Remi';

/** The public demo button stays through the YC window; after this it becomes "Get started". */
export const DEMO_BUTTON_UNTIL = new Date('2027-01-01T00:00:00Z');

export function demoButtonShown(now: Date): boolean {
  return now.getTime() < DEMO_BUTTON_UNTIL.getTime();
}
