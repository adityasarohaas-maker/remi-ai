import { Dock } from './_site/dock';
import { Opening } from './_site/opening';
import { Sections } from './_site/sections';

/** The landing page: Kodi forms in light between the two halves of the name, in a living forest; the story follows on one grid. */
export default function Home() {
  const demoToken = process.env.DEMO_DEVICE_TOKEN || undefined;
  return (
    <main className="forest">
      <Dock demoToken={demoToken} />
      <div className="f-main">
        <Opening />
        <Sections />
      </div>
    </main>
  );
}
