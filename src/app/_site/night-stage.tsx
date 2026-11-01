import { woodsSvg } from './forest/woods';

const WOODS_SEED = 20261022; // the same woods as the landing page

/** The forest standing still: sky, moon, far woods and mist, fixed behind a page that is for reading and doing.
 *  No WebGL: the portal is a work surface, and the stage must cost nothing. */
export function NightStage() {
  return (
    <div className="f-stage" aria-hidden>
      <div className="f-sky" />
      <div className="f-moon" />
      <div className="f-woods"><svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{ __html: woodsSvg(WOODS_SEED) }} /></div>
      <div className="f-mist" />
    </div>
  );
}
