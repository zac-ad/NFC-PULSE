'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

function useFadeIn(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.classList.add('visible');
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

const features = [
  {
    number: '01',
    title: 'One tap to share',
    text: 'Give someone a PULSE and your digital identity is ready when they need it.',
  },
  {
    number: '02',
    title: 'One card. More than one you.',
    text: 'Use PULSE for your professional identity, your personal identity, or both.',
  },
  {
    number: '03',
    title: 'Your card stays current',
    text: 'Change your name, role, links, or contact details without replacing the card in your wallet.',
  },
  {
    number: '04',
    title: 'Share what matters',
    text: 'Choose which links are public and which ones should appear only after a PULSE connection.',
  },
  {
    number: '05',
    title: 'A profile people can act on',
    text: 'Call, message, email, save your contact, visit your links, or connect through the options you provide.',
  },
  {
    number: '06',
    title: 'Built for real introductions',
    text: 'A PULSE is made for the moment a conversation starts — not just for storing a name and number.',
  },
];

const trustPoints = [
  ['You choose what is public', 'Your profile does not have to expose everything. Keep selected contact details and payment options available only after a PULSE connection.'],
  ['Your identity stays in your hands', 'Update your digital profile when your work, links, or contact details change. Your physical card does not need to be replaced.'],
  ['A tap should feel intentional', 'PULSE is designed around a simple idea: share what is useful, keep what is personal under your control.'],
];

export default function FeaturesPage() {
  const hero = useRef<HTMLElement>(null);
  const trust = useRef<HTMLElement>(null);
  const grid = useRef<HTMLElement>(null);
  const close = useRef<HTMLElement>(null);
  useFadeIn(hero);
  useFadeIn(trust);
  useFadeIn(grid);
  useFadeIn(close);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-serif text-base text-white/80 hover:text-white transition-colors">
            <span aria-hidden="true">〰</span>
            PULSE
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/features" className="text-[13px] text-white/80">Features</Link>
            <Link href="/portal" className="text-[13px] text-white/40 hover:text-white/80 transition-colors">Log in</Link>
            <Link href="/onboarding" className="text-[13px] text-white/80 hover:text-white transition-colors border-b border-white/20 hover:border-white/50 pb-px">
              Get your card
            </Link>
          </div>
        </div>
      </nav>

      <section ref={hero} className="fade-section min-h-[78vh] flex items-center px-6 pt-32 pb-24 border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto w-full">
          <p className="text-[11px] font-mono tracking-[0.22em] text-white/30 uppercase mb-8">PULSE · Features</p>
          <h1 className="font-serif text-[clamp(48px,8vw,96px)] leading-[0.98] max-w-4xl text-white">
            Everything people need.
            <br />
            <span className="text-white/35">Nothing they need to figure out.</span>
          </h1>
          <p className="mt-10 max-w-xl text-[17px] leading-relaxed text-white/40">
            PULSE brings your physical introduction and digital identity together in one simple experience.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/onboarding" className="px-7 py-3.5 rounded-full bg-[#7c6ef8] text-white text-[14px] font-medium shadow-[0_0_42px_rgba(124,110,248,0.18)]">
              Get your PULSE
            </Link>
            <Link href="/" className="px-7 py-3.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-[14px] transition-colors">
              See it in action
            </Link>
          </div>
        </div>
      </section>

      <section ref={grid} className="fade-section px-6 py-32 border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="text-[11px] font-mono tracking-[0.2em] text-white/25 mb-4">THE PRODUCT</p>
            <h2 className="font-serif text-[clamp(34px,5vw,64px)] leading-[1.05] text-white">
              Made for the moment
              <br />
              <span className="text-white/35">you meet someone.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 border-t border-white/[0.06]">
            {features.map((feature) => (
              <article key={feature.number} className="py-8 md:pr-12 md:pl-2 border-b border-white/[0.06] md:[&:nth-child(odd)]:border-r md:[&:nth-child(odd)]:pr-12 md:[&:nth-child(even)]:pl-12">
                <p className="font-mono text-[10px] tracking-widest text-[#7c6ef8]/60 mb-8">{feature.number}</p>
                <h3 className="font-serif text-2xl text-white">{feature.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-white/35 max-w-sm">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section ref={trust} className="fade-section px-6 py-32 border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[0.8fr_1.2fr] gap-16">
          <div>
            <p className="text-[11px] font-mono tracking-[0.2em] text-white/25 mb-4">PRIVACY · BY DESIGN</p>
            <h2 className="font-serif text-[clamp(34px,5vw,60px)] leading-[1.05] text-white">
              Share with
              <br />
              <span className="text-white/35">confidence.</span>
            </h2>
          </div>

          <div className="space-y-0">
            {trustPoints.map(([title, text], index) => (
              <div key={title} className="py-7 border-t border-white/[0.06]">
                <div className="flex gap-5">
                  <span className="font-mono text-[10px] text-white/20 pt-1">0{index + 1}</span>
                  <div>
                    <h3 className="text-[15px] font-medium text-white">{title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-white/35 max-w-lg">{text}</p>
                  </div>
                </div>
              </div>
            ))}
            <Link href="/privacy" className="inline-block mt-6 text-[13px] text-white/45 hover:text-white border-b border-white/15 hover:border-white/40 pb-1 transition-colors">
              Read the privacy policy →
            </Link>
          </div>
        </div>
      </section>

      <section ref={close} className="fade-section px-6 py-40">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[11px] font-mono tracking-[0.2em] text-white/25 mb-6">THE PULSE IDEA</p>
          <h2 className="font-serif text-[clamp(40px,6vw,72px)] leading-[1.02] text-white">
            Your identity.
            <br />
            <span className="text-white/35">One tap away.</span>
          </h2>
          <p className="mt-7 text-[16px] text-white/35 max-w-md mx-auto leading-relaxed">
            Carry the card. Control the profile. Share the parts of yourself that belong in the conversation.
          </p>
          <Link href="/onboarding" className="inline-flex mt-10 px-8 py-3.5 rounded-full bg-white text-black text-[14px] font-medium hover:bg-[#f2f0eb] transition-colors">
            Get your PULSE
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.05] px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-white/20 font-mono">
          <span>PULSE · {new Date().getFullYear()}</span>
          <div className="flex gap-6 flex-wrap justify-center">
            <Link href="/features" className="hover:text-white/50 transition-colors">Features</Link>
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
