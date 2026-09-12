'use client';
import Link from 'next/link';

export default function PortalGatewayPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm space-y-10">
        <div className="space-y-2">
          <Link href="/" className="flex items-center gap-2 font-serif text-base text-white/60 hover:text-white transition-colors mb-8 inline-flex">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
            </svg>
            PULSE
          </Link>
          <h1 className="font-serif text-3xl text-white">Welcome back.</h1>
          <p className="text-[14px] text-white/40 leading-relaxed">
            Choose which identity you&rsquo;re logging into.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/portal/professional/login"
            className="block w-full p-5 bg-[#141414] border border-white/[0.08] hover:border-white/20 rounded-2xl transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif text-base text-white">Professional</p>
                <p className="text-[12px] text-white/35 mt-0.5">Work identity · corporate vCard · tap history</p>
              </div>
              <span className="text-white/20 group-hover:text-white/60 transition-colors">→</span>
            </div>
          </Link>

          <Link
            href="/portal/personal/login"
            className="block w-full p-5 bg-[#f2f0eb] border border-black/[0.08] hover:border-black/20 rounded-2xl transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif text-base text-black">Personal</p>
                <p className="text-[12px] text-black/40 mt-0.5">Personal identity · socials · payment links</p>
              </div>
              <span className="text-black/20 group-hover:text-black/60 transition-colors">→</span>
            </div>
          </Link>
        </div>

        <p className="text-[12px] text-white/20 text-center">
          Don&rsquo;t have a card yet?{' '}
          <Link href="/onboarding" className="text-white/50 hover:text-white transition-colors border-b border-white/20 pb-px">
            Get yours.
          </Link>
        </p>
      </div>
    </main>
  );
}
