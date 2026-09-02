import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-neutral-800 flex flex-col justify-between">
      {/* Header Navigation */}
      <header className="border-b border-neutral-900 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-widest uppercase text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
            P U L S E
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/activate" className="text-neutral-400 hover:text-white transition-colors">
              Activate Pass
            </Link>
            <Link href="/dashboard" className="text-neutral-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white rounded-full transition-all"
            >
              Fleet Command
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 py-20 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-full text-[11px] font-mono text-neutral-400">
            <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
            PULSE HARDWARE PLATFORM LIVE
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-white max-w-3xl mx-auto">
            Next-Gen NFC Cards for modern creators & teams.
          </h1>

          <p className="text-neutral-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Connect physical hardware passes to digital live profiles instantly. Instant tap telemetry, decoupled hardware security, and full card fleet control.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/activate"
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-black font-bold text-sm rounded-2xl hover:bg-neutral-200 transition-all shadow-xl"
            >
              Activate Your Hardware Pass
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 bg-neutral-900 border border-neutral-800 text-neutral-200 font-bold text-sm rounded-2xl hover:bg-neutral-800 transition-all"
            >
              Open Profile Dashboard
            </Link>
          </div>

          {/* Hardware Card Preview Graphic */}
          <div className="pt-12 flex justify-center">
            <div className="relative w-72 md:w-96 h-44 md:h-56 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between shadow-2xl group hover:border-neutral-700 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs font-black tracking-widest text-white uppercase">PULSE</span>
                <svg
                  className="w-8 h-8 text-neutral-600 group-hover:text-white transition-colors"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
                </svg>
              </div>
              <div className="space-y-1 text-left">
                <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider">HARDWARE PASS ID</p>
                <p className="text-sm font-mono font-bold text-white tracking-widest">CARD-9002</p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="border-t border-neutral-900 bg-neutral-950/50 py-20">
          <div className="max-w-5xl mx-auto px-6 space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">Engineered for Hardware Decoupling</h2>
              <p className="text-xs text-neutral-400">Total control over physical taps and digital identities.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-black border border-neutral-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center text-emerald-400 font-bold">
                  ⚡
                </div>
                <h3 className="text-sm font-bold text-white">Instant Tap Telemetry</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Every physical card interaction logs real-time timestamps in your user dashboard and central Fleet Command panel.
                </p>
              </div>

              <div className="bg-black border border-neutral-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center text-amber-400 font-bold">
                  🔒
                </div>
                <h3 className="text-sm font-bold text-white">Lost Pass Decoupling</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Deactivate lost hardware cards immediately without taking down your public web link or digital contact details.
                </p>
              </div>

              <div className="bg-black border border-neutral-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center text-sky-400 font-bold">
                  🔄
                </div>
                <h3 className="text-sm font-bold text-white">Card Transferability</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Unclaim physical cards in Fleet Command to recycle, assign to new team members, or re-pair on demand.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-black py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-neutral-500">
          <p className="font-mono">PULSE © 2026 | NFC Digital Business Card System</p>
          <div className="flex gap-4 font-medium">
            <Link href="/activate" className="hover:text-white transition-colors">
              Activate
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/admin" className="hover:text-white transition-colors">
              Fleet Command
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}