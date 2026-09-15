import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Support' };

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <div>
          <Link href="/" className="text-[12px] text-white/30 hover:text-white transition-colors">← Home</Link>
          <p className="font-mono text-[10px] text-white/25 tracking-widest mt-6 mb-3">HELP</p>
          <h1 className="font-serif text-4xl text-white">Support</h1>
          <p className="text-[14px] text-white/40 mt-3 leading-relaxed">
            Something not working, or a question about your card or profile? Reach out directly.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-6 space-y-3">
          <p className="text-[11px] font-mono text-white/25 tracking-widest">EMAIL</p>
          <a
            href="mailto:pulse.companynfc@gmail.com"
            className="font-serif text-xl text-white hover:text-white/70 transition-colors inline-block"
          >
            pulse.companynfc@gmail.com
          </a>
          <p className="text-[13px] text-white/35 leading-relaxed">
            We typically respond within 1–2 business days.
          </p>
        </div>

        <section className="space-y-4 border-t border-white/[0.06] pt-8">
          <h2 className="font-serif text-lg text-white">Common questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'My card isn\u2019t responding when tapped.',
                a: 'Make sure NFC is enabled on the phone doing the tapping, and that the card hasn\u2019t been set to private in your dashboard. If it still doesn\u2019t work, email us the card code printed on the back.',
              },
              {
                q: 'I didn\u2019t receive my sign-in email.',
                a: 'Check your spam or promotions folder first. If it\u2019s not there after a few minutes, email us the address you signed up with and we\u2019ll investigate.',
              },
              {
                q: 'I want to delete my account and data.',
                a: 'Email us your registered address and we\u2019ll process the deletion within 15 business days, per our Privacy Policy.',
              },
              {
                q: 'My card was lost or stolen.',
                a: 'Log into your dashboard and set your profile to private immediately — this stops the card from resolving to your profile. Then email us to have the card permanently deactivated.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="space-y-1.5">
                <p className="text-[14px] text-white/80 font-medium">{q}</p>
                <p className="text-[13px] text-white/40 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-6 text-[12px] text-white/25 border-t border-white/[0.06] pt-8">
          <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
          <Link href="/refund" className="hover:text-white/50 transition-colors">Refund Policy</Link>
        </div>
      </div>
    </main>
  );
}
