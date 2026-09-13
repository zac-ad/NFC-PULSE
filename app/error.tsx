'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-center space-y-6 max-w-sm">
        <p className="font-mono text-[11px] text-white/20 tracking-widest">Error</p>
        <h1 className="font-serif text-3xl text-white">Something went wrong.</h1>
        <p className="text-[14px] text-white/40 leading-relaxed">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="text-[13px] px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-[#f2f0eb] transition-colors"
          >
            Try again
          </button>
          <Link href="/" className="text-[13px] text-white/40 hover:text-white transition-colors">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
