import Link from 'next/link';

const updates = [
  {
    date: 'September 28, 2026',
    label: 'Security · Activation',
    title: 'Every card now has a second key.',
    text: 'PULSE now separates the public card code from a private activation credential. The credential is issued separately, stored only as a hash, and consumed after a successful activation.',
    points: [
      'A copied card code alone cannot activate an unclaimed card.',
      'Activation credentials are single-use and are never stored in plaintext.',
      'Released cards receive a fresh activation credential before they can be activated again.',
    ],
  },
  {
    date: 'September 27, 2026',
    label: 'Security · Tap experience',
    title: 'A stronger foundation for every tap.',
    text: 'PULSE now keeps dashboard card and tap analytics behind authenticated server checks, while viewer-session responses are kept private and non-cacheable.',
    points: [
      'Owner taps still go to the dashboard.',
      'Visitor taps still open the live profile with a temporary connection.',
      'Dashboard telemetry is checked against the signed-in profile before it is returned.',
    ],
  },
  {
    date: 'September 26, 2026',
    label: 'Cards · Security',
    title: 'Card codes can now be rotated safely.',
    text: 'Card-code rotation now uses a staged replacement flow. A new code can be prepared, physically written to the card, tested, and only then made live.',
    points: [
      'The existing card identity stays intact.',
      'The current code remains valid until finalization.',
      'Old codes stop working after a successful rotation.',
    ],
  },
  {
    date: 'September 24, 2026',
    label: 'Privacy · Profiles',
    title: 'Public and connected profiles stay separate.',
    text: 'PULSE now keeps public profile information separate from connection-only details at the database and application layers.',
    points: [
      'Public profile pages show only information marked for public sharing.',
      'Selected private links are available only through a PULSE connection.',
      'Connected profile responses are explicitly kept private.',
    ],
  },
  {
    date: 'September 23, 2026',
    label: 'Activation · Protection',
    title: 'Activation is now one controlled operation.',
    text: 'Card activation was moved into an atomic server-side operation so a card cannot be partially activated if one step fails.',
    points: [
      'Activation attempts are rate-limited.',
      'A card can only be activated from the unclaimed state.',
      'Concurrent activation attempts are handled safely.',
    ],
  },
  {
    date: 'September 22, 2026',
    label: 'Connections · Privacy',
    title: 'Private contact details stay behind the connection.',
    text: 'Viewer sessions now use short-lived, server-validated credentials so a tap can unlock the details that the owner has chosen to keep private without turning them into public profile data.',
    points: [
      'Viewer sessions expire automatically.',
      'Sessions are tied to an active PULSE card and its profile.',
      'Private vCards require a valid PULSE connection.',
    ],
  },
];

export default function UpdatesPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/85 backdrop-blur-md border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-serif text-base text-white/80 hover:text-white transition-colors">
            <span aria-hidden="true">〰</span>
            PULSE
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/features" className="text-[13px] text-white/40 hover:text-white/80 transition-colors">
              Features
            </Link>
            <Link href="/updates" className="text-[13px] text-white/80">
              Updates
            </Link>
            <Link href="/portal" className="text-[13px] text-white/40 hover:text-white/80 transition-colors">
              Log in
            </Link>
            <Link
              href="/onboarding"
              className="hidden sm:inline text-[13px] text-white/80 hover:text-white transition-colors border-b border-white/20 hover:border-white/50 pb-px"
            >
              Get your card
            </Link>
          </div>
        </div>
      </nav>

      <section className="min-h-[72vh] flex items-center px-6 pt-32 pb-24 border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto w-full">
          <p className="text-[11px] font-mono tracking-[0.22em] text-white/30 uppercase mb-8">
            PULSE · Updates
          </p>
          <h1 className="font-serif text-[clamp(48px,8vw,96px)] leading-[0.98] max-w-4xl text-white">
            What changed.
            <br />
            <span className="text-white/35">And what it means.</span>
          </h1>
          <p className="mt-10 max-w-xl text-[17px] leading-relaxed text-white/40">
            A quiet record of the improvements behind PULSE — from the tap experience to the systems that keep your identity yours.
          </p>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="border-t border-white/[0.06]">
            {updates.map((update) => (
              <article key={update.date + update.title} className="py-12 border-b border-white/[0.06]">
                <div className="grid md:grid-cols-[150px_1fr] gap-8">
                  <div>
                    <p className="text-[10px] font-mono tracking-[0.16em] text-white/25 uppercase">
                      {update.date}
                    </p>
                    <p className="mt-2 text-[10px] font-mono tracking-[0.12em] text-[#7c6ef8]/60 uppercase">
                      {update.label}
                    </p>
                  </div>

                  <div>
                    <h2 className="font-serif text-[clamp(28px,4vw,44px)] leading-[1.08] text-white">
                      {update.title}
                    </h2>
                    <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/40">
                      {update.text}
                    </p>

                    <ul className="mt-7 space-y-3">
                      {update.points.map((point) => (
                        <li key={point} className="flex gap-3 text-[13px] leading-relaxed text-white/30">
                          <span className="mt-[0.55em] w-1 h-1 rounded-full bg-white/20 flex-none" aria-hidden="true" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-32 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11px] font-mono tracking-[0.2em] text-white/25 mb-6">THE IDEA STAYS THE SAME</p>
          <h2 className="font-serif text-[clamp(36px,6vw,68px)] leading-[1.04] text-white">
            Your card stays.
            <br />
            <span className="text-white/35">Your profile changes.</span>
          </h2>
          <p className="mt-7 text-[16px] leading-relaxed text-white/35 max-w-md mx-auto">
            PULSE keeps improving the parts you do not have to think about, so the introduction stays simple.
          </p>
          <Link
            href="/features"
            className="inline-flex mt-10 px-8 py-3.5 rounded-full border border-white/10 text-white/55 hover:text-white hover:border-white/20 text-[14px] transition-colors"
          >
            Explore PULSE
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.05] px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-white/20 font-mono">
          <span>PULSE · {new Date().getFullYear()}</span>
          <div className="flex gap-6 flex-wrap justify-center">
            <Link href="/features" className="hover:text-white/50 transition-colors">Features</Link>
            <Link href="/updates" className="text-white/50">Updates</Link>
            <Link href="/portal" className="hover:text-white/50 transition-colors">Log in</Link>
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
          </div>
          <span>Business cards were made for paper.</span>
        </div>
      </footer>
    </main>
  );
}
