// app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans">
      
      {/* MINIMALIST NAV */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tighter">PULSE.</div>
          <div className="hidden md:flex items-center gap-8 text-xs font-medium tracking-widest uppercase text-neutral-400">
            <Link href="#features" className="hover:text-white transition-colors">Hardware</Link>
            <Link href="/portal/personal/login" className="hover:text-white transition-colors">Personal</Link>
            <Link href="/portal/professional/login" className="hover:text-white transition-colors">Enterprise</Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-48 pb-32 px-6 flex flex-col items-center justify-center text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white opacity-[0.02] blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <h1 className="font-serif text-6xl md:text-8xl tracking-tight leading-[1.1]">
            Identity, <br className="hidden md:block" />
            <span className="text-neutral-500">beautifully resolved.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto font-light tracking-wide">
            One tap. Zero friction. The enterprise-grade smart card bridging your physical presence with your digital ecosystem.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link 
              href="/portal/personal/login"
              className="w-full sm:w-auto px-8 py-4 bg-white text-black text-sm font-bold rounded-full hover:scale-105 transition-transform duration-300"
            >
              Get Your PULSE Card
            </Link>
            <Link 
              href="/portal/professional/login"
              className="w-full sm:w-auto px-8 py-4 bg-transparent border border-neutral-700 text-white text-sm font-bold rounded-full hover:border-white hover:bg-neutral-900 transition-all duration-300"
            >
              Enterprise Fleet Login
            </Link>
          </div>
        </div>
      </section>

      {/* HARDWARE TEASER */}
      <section id="features" className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight">Machined for modern networking.</h2>
            <p className="text-neutral-400">No apps required. Powered by near-field communication.</p>
          </div>
          
          <div className="aspect-video max-w-4xl mx-auto bg-neutral-950 border border-neutral-900 rounded-3xl flex items-center justify-center overflow-hidden relative shadow-2xl">
             <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-neutral-900 to-neutral-800 opacity-20" />
             <p className="font-mono text-neutral-600 text-sm tracking-widest">[ HIGH-RES HARDWARE MOCKUP HERE ]</p>
          </div>
        </div>
      </section>

      {/* B2C / B2B DUAL NARRATIVE */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 md:gap-8">
          
          {/* Personal Identity */}
          <div className="space-y-6 p-8 rounded-3xl border border-neutral-900 bg-neutral-950/50 hover:bg-neutral-900/50 transition-colors duration-500">
            <div className="h-12 w-12 rounded-full border border-neutral-800 flex items-center justify-center mb-12">
              <span className="block w-2 h-2 rounded-full bg-white animate-pulse" />
            </div>
            <h3 className="font-serif text-3xl tracking-tight">Your digital pulse.</h3>
            <p className="text-neutral-400 font-light leading-relaxed">
              Unmistakably you. Share your identity, portfolio, and contact details with a single tap. No apps. No friction.
            </p>
          </div>

          {/* Enterprise Fleet */}
          <div className="space-y-6 p-8 rounded-3xl border border-neutral-900 bg-neutral-950/50 hover:bg-neutral-900/50 transition-colors duration-500">
            <div className="h-12 w-12 rounded-full border border-neutral-800 flex items-center justify-center mb-12">
              <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="font-serif text-3xl tracking-tight">The heartbeat of your organization.</h3>
            <p className="text-neutral-400 font-light leading-relaxed">
              Provision, manage, and secure your team's networking from one central command terminal.
            </p>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-neutral-500 font-mono tracking-widest uppercase">
          <div>&copy; {new Date().getFullYear()} PULSE. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}