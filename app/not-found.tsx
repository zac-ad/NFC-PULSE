import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-center space-y-6 max-w-sm">
        <p className="font-mono text-[11px] text-white/20 tracking-widest">404</p>
        <h1 className="font-serif text-3xl text-white">Page not found.</h1>
        <p className="text-[14px] text-white/40 leading-relaxed">
          This page doesn&rsquo;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block text-[13px] px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-[#f2f0eb] transition-colors"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
