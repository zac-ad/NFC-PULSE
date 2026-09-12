import Link from 'next/link';

export default function CardDisabledPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="w-12 h-12 rounded-full border border-white/10 bg-[#141414] flex items-center justify-center mx-auto">
          <div className="w-2 h-2 rounded-full bg-white/20" />
        </div>

        <div className="space-y-3">
          <h1 className="font-serif text-2xl text-white">This card is inactive.</h1>
          <p className="text-[14px] text-white/40 leading-relaxed max-w-xs mx-auto">
            The card you tapped has been deactivated. If this is yours, you can re-enable it from your portal.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Link
            href="/portal"
            className="text-[13px] px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-[#f2f0eb] transition-colors"
          >
            Go to portal
          </Link>
          <Link href="/" className="text-[12px] text-white/25 hover:text-white/50 transition-colors">
            Return home
          </Link>
        </div>

        <p className="text-[11px] font-mono text-white/15 tracking-widest">PULSE</p>
      </div>
    </main>
  );
}
