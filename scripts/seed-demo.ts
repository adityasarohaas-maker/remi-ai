// Run with `npm run seed:demo` — the react-server condition turns `server-only` into a no-op.
import { seedDemo } from '../src/lib/demo-seed';

await seedDemo();
console.log('Demo household seeded.');
