'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// ── Hooks ─────────────────────────────────────────────────────
function useFadeIn(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('visible'); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

// ── Sub-components ────────────────────────────────────────────
function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-void/90 backdrop-blur-md border-b border-white/[0.06]' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative w-2.5 h-2.5 flex-none">
            <span className="absolute inset-0 rounded-full bg-violet pulse-dot" />
          </span>
          <span className="font-serif text-lg text-paper tracking-tight">PULSE</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[13px] text-muted">
          <a href="#story" className="hover:text-paper transition-colors">How it works</a>
          <a href="#portals" className="hover:text-paper transition-colors">Portals</a>
          <a href="#card" className="hover:text-paper transition-colors">The card</a>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/portal" className="text-[13px] text-muted hover:text-paper transition-colors">
            Log in
          </Link>
          <Link
            href="/onboarding"
            className="text-[13px] px-4 py-2 rounded-full bg-paper text-void font-medium hover:bg-paper-dim transition-colors"
          >
            Get your card
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Physical card object ──────────────────────────────────────
function PulseCard({ flipped = false, className = '' }: { flipped?: boolean; className?: string }) {
  return (
    <div
      className={`relative w-72 aspect-[1.586/1] rounded-2xl border transition-all duration-700 ${
        flipped
          ? 'bg-paper border-paper/20'
          : 'bg-surface-2 border-white/10'
      } ${className}`}
    >
      <div className="absolute inset-0 p-6 flex flex-col justify-between rounded-2xl">
        <div className="flex items-center justify-between">
          <span className={`font-serif text-sm ${flipped ? 'text-void/60' : 'text-paper/60'}`}>
            Pulse
          </span>
          <svg
            className={`w-4 h-4 ${flipped ? 'text-void/40' : 'text-paper/40'}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
          </svg>
        </div>
        <div>
          <p className={`text-[10px] font-mono mb-1 ${flipped ? 'text-void/40' : 'text-paper/40'}`}>
            {flipped ? 'personal' : 'professional'}
          </p>
          <p className={`font-serif text-lg ${flipped ? 'text-void' : 'text-paper'}`}>
            {flipped ? 'Isaac' : 'Isaac Salasiban'}
          </p>
          {!flipped && (
            <p className="text-[12px] text-paper/50 mt-0.5">Systems Architect</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function LandingPage() {
  const [tapped, setTapped] = useState(false);
  const [tapping, setTapping] = useState(false);
  const [activeCard] = useState<'pro' | 'personal'>('pro');

  const storyRef   = useRef<HTMLElement>(null);
  const purposeRef = useRef<HTMLElement>(null);
  const adaptRef   = useRef<HTMLElement>(null);
  const persistRef = useRef<HTMLElement>(null);
  const portalsRef = useRef<HTMLElement>(null);
  const cardRef    = useRef<HTMLElement>(null);
  const emotionRef = useRef<HTMLElement>(null);

  useFadeIn(storyRef);
  useFadeIn(purposeRef);
  useFadeIn(adaptRef);
  useFadeIn(persistRef);
  useFadeIn(portalsRef);
  useFadeIn(cardRef);
  useFadeIn(emotionRef);

  function handleTap() {
    if (tapping) return;
    setTapping(true);
    setTimeout(() => {
      setTapped(true);
      setTapping(false);
    }, 550);
  }

  function handleReset() {
    setTapped(false);
  }

  return (
    <>
      <NavBar />

      <main className="bg-void text-paper overflow-x-hidden">

        {/* ── Ch.1 HERO — Attention ──────────────────────────── */}
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 relative">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.035]"
              style={{ background: 'radial-gradient(circle, #7c6ef8, transparent 70%)' }}
            />
          </div>

          <p className="font-mono text-[11px] text-muted mb-10 tracking-wider">
            make an impression
          </p>

          <h1 className="font-serif text-[clamp(48px,8vw,96px)] leading-[1.05] text-paper max-w-3xl">
            <span className="word-mask">
              <span className="word-reveal" style={{ animationDelay: '0s' }}>Business</span>
            </span>{' '}
            <span className="word-mask">
              <span className="word-reveal" style={{ animationDelay: '0.08s' }}>cards</span>
            </span>{' '}
            <span className="word-mask">
              <span className="word-reveal" style={{ animationDelay: '0.16s' }}>were</span>
            </span>
            <br />
            <span className="word-mask">
              <span className="word-reveal" style={{ animationDelay: '0.24s' }}>made</span>
            </span>{' '}
            <span className="word-mask">
              <span className="word-reveal" style={{ animationDelay: '0.32s' }}>for</span>
            </span>{' '}
            <span className="word-mask">
              <span className="word-reveal italic" style={{ animationDelay: '0.4s' }}>paper.</span>
            </span>
          </h1>

          <div
            className="mt-6 h-px w-24 bg-violet signal-line"
            style={{ animationDelay: '0.7s' }}
          />

          <p className="mt-8 text-[17px] text-muted max-w-md leading-relaxed">
            With one tap.
          </p>

          <a
            href="#story"
            className="mt-16 flex flex-col items-center gap-2 text-muted hover:text-paper transition-colors group"
          >
            <span className="text-[12px] font-mono tracking-wider">scroll</span>
            <span className="block w-px h-10 bg-muted/40 group-hover:bg-paper/40 transition-colors" />
          </a>
        </section>

        {/* ── Ch.2–3 DEMONSTRATION — The tap ─────────────────── */}
        <section
          id="story"
          ref={storyRef}
          className="fade-section min-h-screen flex flex-col items-center justify-center px-6 py-24 border-t border-white/[0.06]"
        >
          <div className="max-w-4xl w-full grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="font-serif text-[clamp(32px,4vw,52px)] leading-[1.1] text-paper">
                Card approaches phone.<br />
                Phone responds.<br />
                Profile appears.
              </h2>
              <p className="text-[16px] text-muted leading-relaxed max-w-sm">
                No app. No Bluetooth. No friction. The interaction completes before the thought finishes.
              </p>
              <p className="text-[14px] text-muted/60 leading-relaxed max-w-sm">
                NFC fires in under a second. Your profile — whatever you&rsquo;ve built it to be — opens instantly on their screen.
              </p>
            </div>

            {/* Interactive tap demo */}
            <div className="flex flex-col items-center gap-8">
              <div className="relative flex flex-col items-center gap-6">
                <div
                  className={`transition-all duration-500 ${tapping ? 'card-tap' : ''}`}
                  onClick={!tapped ? handleTap : handleReset}
                  style={{ cursor: tapped ? 'pointer' : 'pointer' }}
                >
                  <PulseCard flipped={activeCard === 'personal'} />
                </div>

                {/* Signal pulse */}
                <div className={`flex items-center gap-3 transition-all duration-300 ${tapping || tapped ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="h-px flex-1 bg-violet/40" />
                  <span className="text-[11px] font-mono text-violet tracking-wider">pulse</span>
                  <div className="h-px flex-1 bg-violet/40" />
                </div>

                {/* Phone response */}
                <div
                  className={`w-48 rounded-2xl border transition-all duration-500 ${
                    tapped
                      ? 'bg-surface border-violet/30 opacity-100 translate-y-0'
                      : 'bg-surface border-white/10 opacity-40 translate-y-2'
                  }`}
                >
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full transition-colors ${tapped ? 'bg-violet' : 'bg-muted'}`} />
                      <span className="text-[10px] font-mono text-muted">
                        {tapped ? 'profile open' : 'waiting...'}
                      </span>
                    </div>
                    {tapped && (
                      <>
                        <p className="font-serif text-sm text-paper">
                          {activeCard === 'personal' ? 'Isaac' : 'Isaac Salasiban'}
                        </p>
                        <p className="text-[11px] text-muted">
                          {activeCard === 'personal' ? 'Personal profile' : 'Systems Architect'}
                        </p>
                        <div className="pt-1 flex gap-1.5 flex-wrap">
                          {activeCard === 'personal'
                            ? ['Instagram', 'WhatsApp'].map(s => (
                                <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-surface-2 text-muted">{s}</span>
                              ))
                            : ['vCard', 'LinkedIn'].map(s => (
                                <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-surface-2 text-muted">{s}</span>
                              ))
                          }
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[12px] font-mono text-muted/60 text-center">
                {tapped ? 'tap the card again to reset' : 'tap the card'}
              </p>
            </div>
          </div>
        </section>

        {/* ── Ch.4 PURPOSE — Why it exists ───────────────────── */}
        <section
          ref={purposeRef}
          className="fade-section px-6 py-32 border-t border-white/[0.06]"
        >
          <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_2fr] gap-16 items-start">
            <div className="md:sticky md:top-32">
              <p className="font-mono text-[11px] text-muted tracking-wider mb-4">why it exists</p>
              <h2 className="font-serif text-[clamp(28px,3.5vw,44px)] leading-[1.1] text-paper">
                PULSE was made for people.
              </h2>
            </div>
            <div className="space-y-8 pt-1">
              <p className="text-[18px] text-muted leading-relaxed max-w-lg">
                Paper cards are permanent the moment they&rsquo;re printed. Your job changes. Your number changes. Your role changes. The card doesn&rsquo;t.
              </p>
              <p className="text-[18px] text-paper leading-relaxed max-w-lg">
                The physical card is constant. The identity it carries can evolve forever.
              </p>
              <p className="text-[16px] text-muted leading-relaxed max-w-lg">
                Update your profile at 9am. Everyone who taps your card at 10am sees the new version. No reprint. No delay. No stack of outdated cards in a drawer.
              </p>
            </div>
          </div>
        </section>

        {/* ── Ch.5–6 ADAPTABILITY — Pro vs Personal ──────────── */}
        <section
          id="portals"
          ref={adaptRef}
          className="fade-section px-6 py-32 border-t border-white/[0.06]"
        >
          <div className="max-w-6xl mx-auto">
            <div className="mb-16 max-w-xl">
              <h2 className="font-serif text-[clamp(28px,3.5vw,44px)] leading-[1.1] text-paper">
                Same card. Different identity.
              </h2>
              <p className="mt-4 text-[16px] text-muted leading-relaxed">
                PULSE supports two modes. The product adapts to which version of you needs to show up.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Professional */}
              <div className="rounded-3xl border border-white/[0.08] bg-surface p-8 space-y-6 group hover:border-white/[0.14] transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-[11px] text-muted mb-2 tracking-wider">professional</p>
                    <h3 className="font-serif text-2xl text-paper">Work identity.</h3>
                  </div>
                  <PulseCard className="w-28 !aspect-[1.586/1] scale-100 opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[15px] text-muted leading-relaxed">
                  Corporate vCard. LinkedIn. Job title. Tap telemetry. Everything a contact needs to reach you professionally — nothing they didn&rsquo;t ask for.
                </p>
                <div className="flex gap-3 pt-2">
                  <Link
                    href="/portal/professional/login"
                    className="text-[13px] px-4 py-2 rounded-full border border-white/15 text-paper hover:border-white/30 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup?preset=PROFESSIONAL"
                    className="text-[13px] px-4 py-2 rounded-full bg-paper text-void font-medium hover:bg-paper-dim transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              </div>

              {/* Personal */}
              <div className="rounded-3xl border border-white/[0.08] bg-paper text-void p-8 space-y-6 group hover:border-void/[0.14] transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-[11px] text-void/50 mb-2 tracking-wider">personal</p>
                    <h3 className="font-serif text-2xl text-void">Personal identity.</h3>
                  </div>
                  <PulseCard flipped className="w-28 !aspect-[1.586/1] opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[15px] text-void/60 leading-relaxed">
                  Instagram. WhatsApp. Venmo. The links that matter outside of work — shared only when you choose to share them.
                </p>
                <div className="flex gap-3 pt-2">
                  <Link
                    href="/portal/personal/login"
                    className="text-[13px] px-4 py-2 rounded-full border border-void/15 text-void hover:border-void/30 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup?preset=PERSONAL"
                    className="text-[13px] px-4 py-2 rounded-full bg-void text-paper font-medium hover:bg-void/80 transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Ch.7 PERSISTENCE — Card stays, profile changes ─── */}
        <section
          ref={persistRef}
          className="fade-section px-6 py-32 border-t border-white/[0.06]"
        >
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="font-serif text-[clamp(28px,3.5vw,44px)] leading-[1.1] text-paper">
                The card doesn&rsquo;t change.<br />
                <em>You do.</em>
              </h2>
              <p className="text-[16px] text-muted leading-relaxed max-w-sm">
                Every tap reads from your live profile. Change your role, number, or links — the card people already have still works, still finds you.
              </p>
            </div>

            {/* Before / After visual */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/[0.06] bg-surface p-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-mono text-muted mb-1">card · unchanged</p>
                  <p className="font-mono text-sm text-paper tracking-widest">CARD-9002</p>
                </div>
                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
                  <span className="text-muted text-xs">✓</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 py-1">
                <div className="h-px flex-1 bg-violet/20" />
                <span className="text-[11px] font-mono text-violet">profile syncs</span>
                <div className="h-px flex-1 bg-violet/20" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'yesterday', name: 'Junior Dev', role: 'Fresh & Co.' },
                  { label: 'today', name: 'Lead Engineer', role: 'New Company' },
                ].map(({ label, name, role }) => (
                  <div key={label} className="rounded-xl border border-white/[0.06] bg-surface p-4">
                    <p className="text-[10px] font-mono text-muted mb-2">{label}</p>
                    <p className="text-sm font-serif text-paper">{name}</p>
                    <p className="text-[12px] text-muted mt-0.5">{role}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Ch.8 THE CARD — Hero object ────────────────────── */}
        <section
          id="card"
          ref={cardRef}
          className="fade-section px-6 py-32 border-t border-white/[0.06]"
        >
          <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_1fr] gap-16 items-center">
            {/* Card showcase */}
            <div className="flex justify-center">
              <div
                className="relative w-80 aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-surface-2 to-void border border-white/10 shadow-2xl"
                style={{ boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}
              >
                <div className="absolute inset-0 p-7 flex flex-col justify-between rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base text-paper/60">Pulse</span>
                    <svg className="w-4 h-4 text-paper/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-paper/30 mb-1">hardware · batteryless</p>
                    <p className="font-mono text-xs text-paper/50 tracking-widest">NFC TYPE 2 · 13.56 MHz</p>
                  </div>
                </div>

                {/* Callout dots */}
                {[
                  { top: '22px', right: '20px', label: 'NFC antenna' },
                  { bottom: '50px', right: '20px', label: 'QR fallback' },
                  { bottom: '22px', left: '28px', label: 'Matte black' },
                ].map(({ label, ...pos }) => (
                  <div key={label} className="absolute flex items-center gap-1.5" style={pos}>
                    <span className="w-1 h-1 rounded-full bg-muted" />
                    <span className="text-[10px] text-muted font-mono">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="font-serif text-[clamp(28px,3.5vw,44px)] leading-[1.1] text-paper">
                Built to work when nothing else does.
              </h2>
              <p className="text-[16px] text-muted leading-relaxed">
                Every card is machined once, paired once. If NFC doesn&rsquo;t fire, the laser-etched QR opens the same profile. If a card goes missing, disable it from your portal — it stops answering immediately.
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[14px]">
                {[
                  ['Finish', 'Matte black polycarbonate'],
                  ['Chip', 'NFC Type 2, 13.56 MHz, batteryless'],
                  ['Fallback', 'Laser-etched QR on reverse'],
                  ['Kill switch', 'Instant remote disable'],
                ].map(([dt, dd]) => (
                  <>
                    <dt key={dt} className="text-muted">{dt}</dt>
                    <dd key={dd} className="text-paper">{dd}</dd>
                  </>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ── Ch.9 EMOTION — The payoff ──────────────────────── */}
        <section
          ref={emotionRef}
          className="fade-section px-6 py-32 border-t border-white/[0.06]"
        >
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <p className="font-mono text-[11px] text-muted tracking-wider">the point</p>
            <h2 className="font-serif text-[clamp(36px,5vw,64px)] leading-[1.05] text-paper">
              Don&rsquo;t hand over a card.
              <br />
              <em className="text-muted">Leave an impression.</em>
            </h2>
            <p className="text-[17px] text-muted leading-relaxed max-w-md mx-auto">
              The people worth knowing remember the ones who made something effortless.
            </p>
          </div>
        </section>

        {/* ── Ch.10 CTA — Action ─────────────────────────────── */}
        <section className="px-6 py-32 border-t border-white/[0.06]">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="space-y-4">
              <h2 className="font-serif text-[clamp(32px,4vw,52px)] leading-[1.1] text-paper">
                A living identity<br />you carry in your wallet.
              </h2>
              <p className="text-[15px] text-muted">PULSE was made for people.</p>
            </div>
            <div className="flex flex-col items-center gap-4 flex-none">
              <Link
                href="/onboarding"
                className="px-8 py-4 rounded-full text-[15px] font-medium transition-all"
                style={{
                  background: '#7c6ef8',
                  color: '#fff',
                  boxShadow: '0 0 40px rgba(124,110,248,0.3)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 60px rgba(124,110,248,0.5)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(124,110,248,0.3)'; }}
              >
                Get your PULSE
              </Link>
              <Link
                href="/portal"
                className="text-[13px] text-muted hover:text-paper transition-colors"
              >
                Already have a card? Log in
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────── */}
        <footer className="border-t border-white/[0.06] px-6 py-10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-muted font-mono">
            <div className="flex items-center gap-2.5">
              <span className="relative w-2 h-2 flex-none">
                <span className="absolute inset-0 rounded-full bg-violet/60 pulse-dot" />
              </span>
              <span>PULSE · {new Date().getFullYear()}</span>
            </div>
            <div className="flex gap-6">
              <Link href="/portal/professional/login" className="hover:text-paper transition-colors">Professional portal</Link>
              <Link href="/portal/personal/login" className="hover:text-paper transition-colors">Personal portal</Link>
              <Link href="/enterprise/login" className="hover:text-paper transition-colors">Enterprise</Link>
            </div>
            <p>Business cards were made for paper.</p>
          </div>
        </footer>

      </main>
    </>
  );
}
