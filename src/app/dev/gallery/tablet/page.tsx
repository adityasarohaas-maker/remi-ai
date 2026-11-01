import { notFound } from 'next/navigation';
import { TabletPreview } from './preview';

/** Development only: the tablet's home screen with sample data, by day or by night (?theme=night). */
export default async function TabletGalleryPage({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { theme } = await searchParams;
  return <TabletPreview night={theme === 'night'} />;
}
