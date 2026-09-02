export default function CardDisabledPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
          !
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Card Deactivated</h1>
        <p className="text-neutral-400 text-sm leading-relaxed mb-6">
          This NFC hardware pass has been deactivated or unlinked by the hardware owner.
        </p>
        <a
          href="/"
          className="inline-block w-full py-3 bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 rounded-xl hover:bg-neutral-800 transition-colors"
        >
          Return Home
        </a>
      </div>
    </main>
  );
}