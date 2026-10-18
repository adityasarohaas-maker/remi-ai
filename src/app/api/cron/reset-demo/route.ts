import { seedDemo } from '@/lib/demo-seed';

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('forbidden', { status: 403 });
  }
  await seedDemo();
  return Response.json({ ok: true });
}
