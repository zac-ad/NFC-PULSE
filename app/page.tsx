import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-neutral-800 flex flex-col justify-between">
      {/* Navigation */}
      <nav className="max-w-5xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-neutral-900">
        <span className="text-xl font-bold tracking-widest text-white">PULSE</span>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link
            href="/activate"
            className="text-neutral-400 hover:text-white transition-colors"
          >
            Activate Pass
          </Link>
          <Link
            href="/dashboard"
            className="bg-white text-black px-4 py-2 rounded-xl font-semibold hover:bg-neutral-200 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6">
        <div className="inline-block bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-full text-xs font-mono text-neutral-400 uppercase tracking-wider mb-2">
          Next-Gen Digital Card Infrastructure
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          One Tap. <br />
          Instant Connection.
        </h1>
        <p className="text-neutral-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          PULSE pairs physical NFC hardware passes with dynamic public profiles, contactless payment QRs, and real-time telemetry analytics.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/activate"
            className="w-full sm:w-auto px-8 py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-all shadow-lg text-center"
          >
            Pair Your Hardware Card
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 bg-neutral-900 border border-neutral-800 text-neutral-200 font-semibold rounded-xl hover:bg-neutral-800 transition-all text-center"
          >
            Manage Your Live Profile
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-950 border border-neutral-900 p-6 rounded-2xl space-y-2">
          <div className="text-lg font-bold text-white">Smart Hardware Routing</div>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Dynamic status switching routes unassigned cards to activation, active cards to profiles, and disabled cards to boundary screens.
          </p>
        </div>

        <div className="bg-neutral-950 border border-neutral-900 p-6 rounded-2xl space-y-2">
          <div className="text-lg font-bold text-white">Instant Contact Saving</div>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Native `.vcf` generation allows instant mobile phonebook syncing with zero required app installs for recipients.
          </p>
        </div>

        <div className="bg-neutral-950 border border-neutral-900 p-6 rounded-2xl space-y-2">
          <div className="text-lg font-bold text-white">Payment & Link Engine</div>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Embed GCash or banking QR lightboxes alongside custom link stacks for fast payment collections during networking.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full px-6 py-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
        <div>© 2026 PULSE Card Management Engine. All rights reserved.</div>
        <div className="flex gap-6">
          <Link href="/admin" className="hover:text-neutral-400 transition-colors">
            Fleet Command
          </Link>
          <Link href="/dashboard" className="hover:text-neutral-400 transition-colors">
            Profile Portal
          </Link>
        </div>
      </footer>
    </main>
  );
}