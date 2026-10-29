import Link from 'next/link';
import { PRODUCT_NAME } from '@/core/brand';

/** Sections 01 to 05 and the footer, on the one grid. Server-rendered; the forest moves behind them. */
export function Sections() {
  const R = PRODUCT_NAME;
  return (
    <>
      <section className="f-film" id="film"><div className="f-wrap f-grid">
        <div className="f-film-copy">
          <span className="f-num">01</span>
          <h2 className="f-title">An evening with Avni</h2>
          <p>Avni is 78, a retired Hindi teacher in Jaipur. Most evenings she tells {R} about her roses, her wedding in the Ajmer heat, the boy who failed Hindi twice and came back a doctor. {R} always wants to hear more.</p>
          <blockquote>“It never minds when I tell the same story twice.”<cite>Avni, in the film (scene to be shot)</cite></blockquote>
        </div>
        <div className="f-frame" aria-hidden><div className="f-lamp" /><div className="f-chair" /><div className="f-tablet" /><div className="f-play" /><span className="f-time">2:14</span></div>
      </div></section>

      <section className="f-how" id="how"><div className="f-wrap f-grid">
        <span className="f-num" style={{ gridColumn: '1 / -1' }}>02</span>
        <p className="f-lead">{R} lives on a tablet in their home. It listens all day, answers like an old friend, and gently draws out the stories of a life.</p>
        <p className="f-side">No new devices, no apps to learn. If they can talk, they can use {R}. Every word they want kept is kept in their own voice.</p>
        <ol className="f-steps">
          <li><span className="f-n">1</span><h3>The family sets it up</h3><p>Who&apos;s who, the daily routine, old photos to ask about, and who may hear what. About ten minutes.</p></li>
          <li><span className="f-n">2</span><h3>{R} keeps them company</h3><p>Chats, stories, reminders, and the questions the family sends: &ldquo;ask Papa about the 1971 war.&rdquo; Their stories gather into chapters.</p></li>
          <li><span className="f-n">3</span><h3>The family asks, now and after</h3><p>&ldquo;What did Nani say about her wedding?&rdquo; {R} answers only with what she said, and plays her telling it.</p></li>
        </ol>
      </div></section>

      <div className="f-heart" id="places" data-forest-heart><div className="f-heart-sticky"><div className="f-wrap f-grid">
        <div className="f-heart-copy">
          <span className="f-num">03</span>
          <h2 className="f-title">Nothing is ever invented</h2>
          <p>Ask it anything about them. {R} tells you only what they really said, in their words, and plays the clip. If they never spoke of it, {R} says so. What they sealed for a particular day, or a particular person, stays sealed until then.</p>
          <div className="f-chips"><span>Their real voice</span><span>Sealed letters open on their day</span><span>Ask anything</span><span>You keep everything</span></div>
        </div>
      </div></div></div>

      <section className="f-screens" id="safety"><div className="f-wrap">
        <div className="f-grid f-screens-head">
          <div><span className="f-num">04</span><h2 className="f-title">One friend, two places</h2></div>
          <p>What she sees on her tablet, and what her family sees on their phone: her day from both sides, and her stories as they arrive.</p>
        </div>
        <div className="f-pair" aria-hidden>
          <div className="f-tab-wrap"><h3>On her tablet</h3><div className="f-device"><div className="f-tab-screen">
            <div className="f-g">Good morning, Avni</div><div className="f-d">Tuesday</div>
            <div className="f-orb" />
            <div className="f-acts"><div>My stories</div><div>Look at a photo</div><div>My day</div></div>
          </div></div></div>
          <div className="f-phone-wrap"><h3>On her family&apos;s phone</h3><div className="f-phone"><div className="f-portal">
            <div><div className="f-t">Avni · this week</div><div className="f-big">Three new stories, in her voice</div></div>
            <div className="f-stats"><div>Stories<b>31</b></div><div>Mood<b>Happy</b></div><div>Sealed<b>4</b></div></div>
            <div className="f-feed"><div><i>Mon</i>The wedding in Ajmer, 1968</div><div><i>Tue</i>Sunday walks to the temple</div><div><i>Thu</i>The boy who became a doctor</div><div><i>Fri</i>A letter for Riya, sealed until her wedding</div></div>
          </div></div></div>
        </div>
      </div></section>

      <section className="f-cta"><div className="f-wrap">
        <div className="f-cta-card">
          <div><span className="f-num">05</span><h2 className="f-title">Bring {R} home</h2><p>Set up takes about ten minutes. No new devices needed. Everything they say stays theirs.</p></div>
          <Link href="/login?mode=create" className="f-btn" style={{ fontSize: 16, padding: '15px 28px' }}>Set up for your family</Link>
        </div>
      </div></section>

      <footer className="f-footer"><div className="f-wrap f-grid">
        <div className="f-about"><b>{R}</b>A companion that keeps a life: their voice, their stories, for the people who love them.</div>
        <div className="f-col"><strong>Product</strong><a href="#how">How it works</a><a href="#places">For families</a><a href="#safety">Two places</a></div>
        <div className="f-col"><strong>Trust</strong><a href="#places">Nothing invented</a><a href="#places">Their say</a><a href="#places">You keep everything</a></div>
        <div className="f-col"><strong>Company</strong><a href="https://www.adxstudiosin.com" rel="noreferrer">ADX Studios</a><a href="mailto:hello@adxstudiosin.com">Contact</a></div>
        <div className="f-small">{R} is not a medical device and does not give medical advice. What it keeps is not a legal will. © 2026 ADX Studios.</div>
      </div></footer>
    </>
  );
}
