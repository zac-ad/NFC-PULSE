import Link from 'next/link';

export default function MarketingLandingPage() {
  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-neutral-800 flex flex-col relative overflow-hidden">
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/40 via-neutral-950/20 to-transparent blur-3xl pointer-events-none -z-10" />

      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-20">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-white text-black rounded-xl flex items-center justify-center font-black text-base shadow-lg group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <span className="text-lg font-black tracking-widest uppercase text-white">PULSE</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-neutral-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#hardware" className="hover:text-white transition-colors">Hardware Pass</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link 
            href="/portal/professional/login" 
            className="px-4 py-2 text-xs font-semibold text-sky-400 hover:text-sky-300 border border-sky-500/20 bg-sky-500/10 rounded-full transition-all"
          >
            Pro Portal ↗
          </Link>
          <Link 
            href="/portal/personal/login" 
            className="px-4 py-2 text-xs font-bold bg-emerald-400 text-black rounded-full hover:bg-emerald-300 transition-all active:scale-95 shadow-[0_0_20px_rgba(52,211,153,0.2)]"
          >
            Personal Portal ↗
          </Link>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-16 pb-24 z-10 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-neutral-800 bg-neutral-950/80 backdrop-blur-md shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-neutral-300 tracking-wide uppercase">
            PULSE Smart NFC Platform
          </span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 leading-[1.08] bg-clip-text text-transparent bg-gradient-to-b from-white via-neutral-200 to-neutral-500">
          The last business card you’ll ever need.
        </h1>
        
        <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mb-10 leading-relaxed font-normal">
          PULSE pairs precision-crafted physical NFC hardware with a dual-identity digital engine. Share work or personal channels with a single tap.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            href="/portal/professional/login" 
            className="px-8 py-4 bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95"
          >
            Professional Portal
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link 
            href="/portal/personal/login" 
            className="px-8 py-4 bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95"
          >
            Personal Portal
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </section>

      <section id="hardware" className="w-full max-w-5xl mx-auto px-6 py-12 z-10">
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-8 md:p-12 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-md">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Hardware Architecture</span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Matte Black NFC Pass</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Crafted with industrial durability, embedded high-frequency NFC chips, and printed QR fallback technology for seamless compatibility with all modern smartphones.
            </p>
            <div className="pt-2 flex items-center gap-6 text-xs text-neutral-300 font-medium">
              <span className="flex items-center gap-1.5">✓ No Battery Required</span>
              <span className="flex items-center gap-1.5">✓ Instant Tap Telemetry</span>
            </div>
          </div>

          <div className="w-full max-w-xs aspect-[1.586/1] bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between relative group hover:border-neutral-700 transition-all">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-mono tracking-widest text-neutral-400">PULSE PASS</span>
              </div>
              <span className="text-xs">⚡</span>
            </div>
            <div>
              <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">HARDWARE ID</p>
              <p className="text-sm font-mono font-bold text-neutral-200 tracking-widest mt-0.5">CARD-9002</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="w-full max-w-5xl mx-auto px-6 py-16 z-10">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Engineered for Performance</h2>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">Everything you need to manage your digital presence in one integrated platform.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-950 border border-neutral-800/80 p-6 rounded-3xl backdrop-blur-md space-y-3">
            <div className="w-10 h-10 bg-neutral-900 rounded-2xl flex items-center justify-center text-lg">💼</div>
            <h3 className="text-sm font-bold text-white">Dual Identity Engine</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Switch effortlessly between Professional and Personal identities. Control what people see based on where you are networking.
            </p>
          </div>

          <div className="bg-neutral-950 border border-neutral-800/80 p-6 rounded-3xl backdrop-blur-md space-y-3">
            <div className="w-10 h-10 bg-neutral-900 rounded-2xl flex items-center justify-center text-lg">🔗</div>
            <h3 className="text-sm font-bold text-white">Native Deep Linking</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Links automatically trigger native iOS and Android apps for Instagram, LinkedIn, WhatsApp, and Telegram instead of browser tabs.
            </p>
          </div>

          <div className="bg-neutral-950 border border-neutral-800/80 p-6 rounded-3xl backdrop-blur-md space-y-3">
            <div className="w-10 h-10 bg-neutral-900 rounded-2xl flex items-center justify-center text-lg">🔒</div>
            <h3 className="text-sm font-bold text-white">Instant Hardware Lock</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Misplaced your physical pass? Toggle the privacy lock in your dashboard to instantly secure your public link.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="w-full max-w-5xl mx-auto px-6 py-16 border-t border-neutral-900/80 z-10">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Three Steps to Connect</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="w-8 h-8 bg-white text-black font-bold rounded-full flex items-center justify-center mx-auto text-xs">1</div>
            <h4 className="text-sm font-bold">Claim Identity</h4>
            <p className="text-xs text-neutral-400">Create your account and select your custom profile URL.</p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 bg-white text-black font-bold rounded-full flex items-center justify-center mx-auto text-xs">2</div>
            <h4 className="text-sm font-bold">Pair Hardware</h4>
            <p className="text-xs text-neutral-400">Enter your card code to bind the physical pass to your profile.</p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 bg-white text-black font-bold rounded-full flex items-center justify-center mx-auto text-xs">3</div>
            <h4 className="text-sm font-bold">Tap & Share</h4>
            <p className="text-xs text-neutral-400">Hold your pass near any smartphone to instantly share contacts.</p>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-neutral-900 py-8 z-10 mt-auto">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 font-medium gap-4">
          <p>© {new Date().getFullYear()} PULSE. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/portal/professional/login" className="hover:text-neutral-300 transition-colors">Pro Portal</Link>
            <Link href="/portal/personal/login" className="hover:text-neutral-300 transition-colors">Personal Portal</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}