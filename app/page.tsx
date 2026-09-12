'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

// ── Scroll fade hook ──────────────────────────────────────────
function useFadeIn(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('visible'); },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

// ── Card object — the recurring hero ─────────────────────────
function PulseCard({
  mode = 'pro',
  size = 'md',
  className = '',
}: {
  mode?: 'pro' | 'personal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dims = { sm: 'w-36', md: 'w-64', lg: 'w-80' };
  const isPro = mode === 'pro';
  return (
    <div
      className={`${dims[size]} aspect-[1.586/1] rounded-2xl relative transition-all duration-700 ${
        isPro
          ? 'bg-[#141414] border border-white/10'
          : 'bg-[#f2f0eb] border border-black/10'
      } ${className}`}
    >
      <div className="absolute inset-0 p-5 flex flex-col justify-between rounded-2xl">
        <div className="flex items-center justify-between">
          <span className={`font-serif text-xs ${isPro ? 'text-white/50' : 'text-black/40'}`}>
            Pulse
          </span>
          <svg className={`w-3.5 h-3.5 ${isPro ? 'text-white/30' : 'text-black/25'}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
          </svg>
        </div>
        <div>
          <p className={`text-[9px] font-mono mb-1 ${isPro ? 'text-white/30' : 'text-black/30'}`}>
            {isPro ? 'professional' : 'personal'}
          </p>
          <p className={`font-serif text-sm leading-tight ${isPro ? 'text-white' : 'text-black'}`}>
            {isPro ? 'Isaac Salasiban' : 'Isaac'}
          </p>
          {isPro && <p className="text-[11px] mt-0.5 text-white/40">Systems Architect</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function LandingPage() {
  const [tapState, setTapState] = useState<'idle' | 'approaching' | 'connected'>('idle');
  const [identity, setIdentity] = useState<'pro' | 'personal'>('pro');
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const s2  = useRef<HTMLElement>(null);
  const s3  = useRef<HTMLElement>(null);
  const s4  = useRef<HTMLElement>(null);
  const s5  = useRef<HTMLElement>(null);
  const s6  = useRef<HTMLElement>(null);
  const s7  = useRef<HTMLElement>(null);
  const s8  = useRef<HTMLElement>(null);
  const s9  = useRef<HTMLElement>(null);
  useFadeIn(s2); useFadeIn(s3); useFadeIn(s4);
  useFadeIn(s5); useFadeIn(s6); useFadeIn(s7);
  useFadeIn(s8); useFadeIn(s9);

  const handleTap = useCallback(() => {
    if (tapState !== 'idle') {
      setTapState('idle');
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      return;
    }
    setTapState('approaching');
    tapTimerRef.current = setTimeout(() => {
      setTapState('connected');
    }, 700);
  }, [tapState]);

  useEffect(() => () => { if (tapTimerRef.current) clearTimeout(tapTimerRef.current); }, []);

  const profileLinks = {
    pro: ['Corporate vCard', 'LinkedIn', 'Calendar'],
    personal: ['Instagram', 'WhatsApp', 'Venmo'],
  };

  return (
    <>
      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-serif text-base text-white/80 hover:text-white transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
            </svg>
            PULSE
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/portal" className="text-[13px] text-white/40 hover:text-white/80 transition-colors">
              Log in
            </Link>
            <Link href="/onboarding" className="text-[13px] text-white/80 hover:text-white transition-colors border-b border-white/20 hover:border-white/50 pb-px">
              Get your card
            </Link>
          </div>
        </div>
      </nav>

      <main className="bg-[#0a0a0a] text-[#f2f0eb] overflow-x-hidden">

        {/* ── 01 · HERO ─────────────────────────────────────── */}
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 relative">
          {/* single, quiet radial — appears only here */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[800px] h-[800px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(124,110,248,0.06) 0%, transparent 65%)' }} />
          </div>

          <h1 className="font-serif text-[clamp(52px,9vw,108px)] leading-[1.0] text-white relative z-10">
            <span className="word-mask"><span className="word-reveal" style={{ animationDelay: '0s' }}>Make</span></span>{' '}
            <span className="word-mask"><span className="word-reveal" style={{ animationDelay: '0.07s' }}>an</span></span>
            <br />
            <span className="word-mask"><span className="word-reveal" style={{ animationDelay: '0.14s' }}>impression.</span></span>
          </h1>

          <p className="mt-8 font-serif text-[clamp(20px,3vw,28px)] text-white/40 relative z-10">
            With one tap.
          </p>

          <a href="#ch2" className="mt-20 flex flex-col items-center gap-3 text-white/25 hover:text-white/50 transition-colors relative z-10">
            <span className="text-[11px] font-mono tracking-[0.2em]">scroll</span>
            <span className="block w-px h-12 bg-current" />
          </a>
        </section>

        {/* ── 02 · BRAND STATEMENT ──────────────────────────── */}
        <section id="ch2" ref={s2} className="fade-section px-6 py-32 border-t border-white/[0.05]">
          <div className="max-w-5xl mx-auto">
            <p className="font-serif text-[clamp(32px,5vw,64px)] leading-[1.08] text-white max-w-2xl">
              Business cards were made for paper.
            </p>
            <div className="mt-6 h-px w-16 bg-[#7c6ef8]" />
          </div>
        </section>

        {/* ── 03 · PULSE WAS MADE FOR PEOPLE ───────────────── */}
        <section ref={s3} className="fade-section px-6 py-32 border-t border-white/[0.05]">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-12">
            <p className="font-serif text-[clamp(32px,5vw,64px)] leading-[1.08] text-white max-w-xl">
              PULSE was made<br />for people.
            </p>
            <p className="text-[16px] text-white/40 max-w-xs leading-relaxed md:pb-2">
              The physical card never changes. The identity it carries can evolve every day — update once, and everyone who taps your card sees the new you.
            </p>
          </div>
        </section>

        {/* ── 04 · TAP DEMONSTRATION ────────────────────────── */}
        <section ref={s4} className="fade-section px-6 py-32 border-t border-white/[0.05]">
          <div className="max-w-5xl mx-auto">
            <p className="font-mono text-[11px] text-white/30 tracking-[0.2em] mb-16 text-center">tap → share → connect</p>

            {/* The relationship: card ← signal → phone */}
            <div className="flex items-center justify-center gap-0 md:gap-8">

              {/* Card side */}
              <div className="flex flex-col items-center gap-4">
                <div
                  onClick={handleTap}
                  className={`cursor-pointer transition-all duration-700 select-none ${
                    tapState === 'approaching' ? 'translate-x-6 md:translate-x-10' :
                    tapState === 'connected'   ? 'translate-x-3 md:translate-x-6' : ''
                  }`}
                >
                  <PulseCard mode={identity} size="md" />
                </div>
                <p className="text-[11px] font-mono text-white/25">
                  {tapState === 'idle' ? 'tap the card' : tapState === 'approaching' ? 'approaching...' : 'connected'}
                </p>
              </div>

              {/* Signal channel */}
              <div className="flex-1 max-w-[120px] flex items-center justify-center relative h-16 mx-2">
                {tapState !== 'idle' && (
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center gap-1 justify-center">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1 h-1 rounded-full bg-[#7c6ef8]"
                        style={{
                          opacity: tapState === 'connected' ? 0.9 : 0.4,
                          animation: tapState === 'approaching'
                            ? `pulse-dot 0.8s ease-in-out ${i * 0.15}s infinite`
                            : 'none',
                        }}
                      />
                    ))}
                  </div>
                )}
                {tapState === 'idle' && (
                  <div className="w-full h-px bg-white/[0.06]" />
                )}
              </div>

              {/* Phone side */}
              <div className="flex flex-col items-center gap-4">
                <div
                  className={`w-40 rounded-2xl border transition-all duration-500 overflow-hidden ${
                    tapState === 'connected'
                      ? 'border-[#7c6ef8]/40 bg-[#141414]'
                      : 'border-white/[0.06] bg-[#0e0e0e]'
                  }`}
                >
                  <div className="p-4 min-h-[102px] flex flex-col justify-between">
                    {tapState === 'connected' ? (
                      <>
                        <div className="flex items-center gap-1.5 mb-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7c6ef8]" />
                          <span className="text-[9px] font-mono text-[#7c6ef8] tracking-wider">profile open</span>
                        </div>
                        <div>
                          <p className="font-serif text-sm text-white">
                            {identity === 'pro' ? 'Isaac Salasiban' : 'Isaac'}
                          </p>
                          <p className="text-[11px] text-white/40 mt-0.5">
                            {identity === 'pro' ? 'Systems Architect' : 'Personal'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {profileLinks[identity].map(l => (
                              <span key={l} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{l}</span>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[10px] font-mono text-white/15">waiting</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[11px] font-mono text-white/25">phone</p>
              </div>
            </div>

            <p className="text-center mt-16 font-serif text-[clamp(18px,2.5vw,26px)] text-white/60">
              One tap. Everything worth sharing.
            </p>
          </div>
        </section>

        {/* ── 05 · ONE PULSE, TWO EXPERIENCES ──────────────── */}
        <section id="portals" ref={s5} className="fade-section px-6 py-32 border-t border-white/[0.05]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-[clamp(28px,4vw,52px)] leading-[1.08] text-white">
                One PULSE.<br />Two experiences.
              </h2>
              <p className="mt-4 text-[15px] text-white/40">The product adapts to which version of you shows up.</p>
            </div>

            {/* Identity toggle */}
            <div className="flex flex-col items-center gap-10">
              <div className="inline-flex rounded-full bg-white/[0.04] border border-white/[0.08] p-1">
                {(['pro', 'personal'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setIdentity(mode)}
                    className={`px-6 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 ${
                      identity === mode
                        ? 'bg-white text-black'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {mode === 'pro' ? 'Professional' : 'Personal'}
                  </button>
                ))}
              </div>

              {/* Single transforming identity */}
              <div className="w-full max-w-sm">
                <div className={`rounded-3xl p-8 border transition-all duration-500 ${
                  identity === 'pro'
                    ? 'bg-[#141414] border-white/10'
                    : 'bg-[#f2f0eb] border-black/10'
                }`}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className={`text-[10px] font-mono mb-2 ${identity === 'pro' ? 'text-white/30' : 'text-black/30'}`}>
                        {identity === 'pro' ? 'professional identity' : 'personal identity'}
                      </p>
                      <p className={`font-serif text-2xl ${identity === 'pro' ? 'text-white' : 'text-black'}`}>
                        {identity === 'pro' ? 'Isaac Salasiban' : 'Isaac'}
                      </p>
                      {identity === 'pro' && (
                        <p className="text-[13px] text-white/40 mt-1">Systems Architect</p>
                      )}
                    </div>
                    <PulseCard mode={identity} size="sm" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {profileLinks[identity].map(link => (
                      <span
                        key={link}
                        className={`text-[12px] px-3 py-1.5 rounded-full ${
                          identity === 'pro'
                            ? 'bg-white/5 text-white/50'
                            : 'bg-black/5 text-black/50'
                        }`}
                      >
                        {link}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Portal links — understated */}
              <div className="flex items-center gap-6 text-[13px]">
                <Link href={`/portal/${identity === 'pro' ? 'professional' : 'personal'}/login`}
                  className="text-white/30 hover:text-white/60 transition-colors">
                  Log in
                </Link>
                <span className="text-white/10">·</span>
                <Link href={`/signup?preset=${identity === 'pro' ? 'PROFESSIONAL' : 'PERSONAL'}`}
                  className="text-white/60 hover:text-white transition-colors border-b border-white/20 hover:border-white/50 pb-px">
                  Create {identity === 'pro' ? 'professional' : 'personal'} profile
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 06 · CARD STAYS / PROFILE CHANGES ────────────── */}
        <section ref={s6} className="fade-section px-6 py-32 border-t border-white/[0.05]">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-serif text-[clamp(28px,4vw,52px)] leading-[1.08] text-white">
                Your card stays.<br />
                <span className="text-white/40">Your profile changes.</span>
              </h2>
              <p className="mt-6 text-[16px] text-white/40 leading-relaxed max-w-sm">
                Update your role at 9am. Everyone who taps at 10am sees the new version. No reprint. No delay.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono text-white/25 mb-1">physical card · unchanged</p>
                  <p className="font-mono text-sm text-white tracking-widest">CARD-9002</p>
                </div>
                <span className="text-[11px] font-mono text-white/20">permanent</span>
              </div>

              <div className="flex items-center gap-3 py-2 px-5">
                <div className="h-px flex-1 bg-[#7c6ef8]/20" />
                <span className="text-[10px] font-mono text-[#7c6ef8]/60">profile syncs</span>
                <div className="h-px flex-1 bg-[#7c6ef8]/20" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { t: 'yesterday', name: 'Junior Developer', co: 'First Company' },
                  { t: 'today',     name: 'Lead Engineer',    co: 'New Company' },
                ].map(({ t, name, co }) => (
                  <div key={t} className="rounded-xl border border-white/[0.05] bg-[#111] p-4">
                    <p className="text-[10px] font-mono text-white/25 mb-2">{t}</p>
                    <p className="font-serif text-sm text-white">{name}</p>
                    <p className="text-[11px] text-white/35 mt-0.5">{co}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 07 · LIVE PROFILE ─────────────────────────────── */}
        <section ref={s7} className="fade-section px-6 py-32 border-t border-white/[0.05]">
          <div className="max-w-5xl mx-auto text-center space-y-12">
            <h2 className="font-serif text-[clamp(28px,4vw,52px)] leading-[1.08] text-white">
              One profile.<br />
              <span className="text-white/40">Everything worth sharing.</span>
            </h2>

            {/* Profile preview — representative, not a full screenshot */}
            <div className="inline-block text-left w-full max-w-xs rounded-3xl border border-white/[0.08] bg-[#111] overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10" />
                  <div>
                    <p className="font-serif text-sm text-white">Isaac Salasiban</p>
                    <p className="text-[11px] text-white/40">Systems Architect</p>
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  {['LinkedIn', 'Corporate vCard', 'Book a meeting', 'Portfolio'].map(item => (
                    <div key={item} className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                      <span className="text-[13px] text-white/70">{item}</span>
                      <span className="text-[11px] text-white/20">→</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[14px] font-mono text-white/25 tracking-wider">
              this is what they see when they tap
            </p>
          </div>
        </section>

        {/* ── 08 · THE CARD ─────────────────────────────────── */}
        <section id="card" ref={s8} className="fade-section px-6 py-32 border-t border-white/[0.05]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="font-serif text-[clamp(32px,5vw,64px)] leading-[1.05] text-white">
                Made to be carried.
              </h2>
            </div>

            {/* Card — large, nothing competing */}
            <div className="flex justify-center mb-20">
              <div
                className="relative rounded-3xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/[0.08]"
                style={{
                  width: 'min(400px, 85vw)',
                  aspectRatio: '1.586',
                  boxShadow: '0 60px 120px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
                }}
              >
                <div className="absolute inset-0 p-8 flex flex-col justify-between rounded-3xl">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base text-white/50">Pulse</span>
                    <svg className="w-5 h-5 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-white/20 tracking-widest mb-1">NFC · BATTERYLESS</p>
                    <p className="font-mono text-[11px] text-white/30 tracking-widest">CARD-9002</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Minimal specs — below the object, not competing */}
            <div className="max-w-sm mx-auto space-y-3">
              {[
                ['Finish', 'Matte black polycarbonate'],
                ['NFC', 'Type 2 · 13.56 MHz · batteryless'],
                ['Fallback', 'Laser-etched QR on reverse'],
                ['If lost', 'Disable instantly from your portal'],
              ].map(([dt, dd]) => (
                <div key={dt} className="flex justify-between text-[13px] border-b border-white/[0.04] pb-3">
                  <span className="text-white/30 font-mono text-[11px]">{dt}</span>
                  <span className="text-white/60">{dd}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 09 · EMOTION ─────────────────────────────────── */}
        <section ref={s9} className="fade-section px-6 py-40 border-t border-white/[0.05]">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-[clamp(36px,6vw,72px)] leading-[1.05] text-white">
              Don&rsquo;t hand over a card.
              <br />
              <span className="text-white/35">Leave an impression.</span>
            </h2>
            <p className="mt-8 text-[17px] text-white/35 leading-relaxed max-w-sm mx-auto">
              The people worth knowing remember the ones who made something effortless.
            </p>
          </div>
        </section>

        {/* ── 10 · CTA ─────────────────────────────────────── */}
        <section className="px-6 py-32 border-t border-white/[0.05]">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
            <div>
              <h2 className="font-serif text-[clamp(28px,4vw,52px)] leading-[1.08] text-white">
                Share your PULSE.
              </h2>
              <p className="mt-3 text-[15px] text-white/35">A living identity you carry in your wallet.</p>
            </div>

            <div className="flex flex-col items-center gap-4 flex-none">
              {/* Violet appears here — the only prominent use */}
              <Link
                href="/onboarding"
                className="px-10 py-4 rounded-full text-[15px] font-medium text-white transition-all"
                style={{ background: '#7c6ef8', boxShadow: '0 0 48px rgba(124,110,248,0.25)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 72px rgba(124,110,248,0.45)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 48px rgba(124,110,248,0.25)'; }}
              >
                Get your PULSE
              </Link>
              <Link href="/portal" className="text-[13px] text-white/25 hover:text-white/50 transition-colors">
                Already have a card? Log in
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className="border-t border-white/[0.05] px-6 py-10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-white/20 font-mono">
            <span>PULSE · {new Date().getFullYear()}</span>
            <div className="flex gap-8">
              <Link href="/portal/professional/login" className="hover:text-white/50 transition-colors">Professional</Link>
              <Link href="/portal/personal/login"     className="hover:text-white/50 transition-colors">Personal</Link>
              <Link href="/enterprise/login"          className="hover:text-white/50 transition-colors">Enterprise</Link>
            </div>
            <span>Business cards were made for paper.</span>
          </div>
        </footer>

      </main>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </>
  );
}
