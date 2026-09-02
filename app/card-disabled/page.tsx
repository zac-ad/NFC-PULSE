import Link from 'next/link';

export default function CardDisabledPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans">
      <div className="max-w-sm w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-8 text-center shadow-2xl space-y-5">
        <div className="w-14 h-14 bg-red-950/60 border border-red-800/80 text-red-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-lg">
          🚫
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Card Deactivated</h1>
          <p className="text-neutral-400 text-xs leading-relaxed">
            This physical NFC card has been deactivated by fleet administration. Hardware pass access is currently disabled.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-block w-full py-3.5 bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-300 rounded-2xl hover:bg-neutral-800 hover:text-white transition-all shadow-sm"
          >
            Return Home
          </Link>
        </div>

        <p className="text-[11px] text-neutral-600 pt-2 font-medium tracking-wide">
          Powered by <span className="font-bold text-neutral-400">P U L S E</span>
        </p>
      </div>
    </main>
  );
}