import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Cookie Policy' };

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <div>
          <Link href="/" className="text-[12px] text-white/30 hover:text-white transition-colors">← Home</Link>
          <p className="font-mono text-[10px] text-white/25 tracking-widest mt-6 mb-3">LEGAL</p>
          <h1 className="font-serif text-4xl text-white">Cookie Policy</h1>
        </div>

        {[
          {
            title: 'What cookies we use',
            body: `PULSE uses two types of cookies:

1. Authentication session cookie (pulse_session / sb-* cookies set by Supabase)
   Purpose: Keeps you logged in to your dashboard.
   Duration: Session / up to 7 days.
   Required: Yes — the service cannot function without this.

2. Admin session cookie (admin_session)
   Purpose: Keeps admin users logged in to the admin panel.
   Duration: 24 hours.
   Required: Yes — only set when you log in to the admin panel.

We do NOT use:
• Advertising or tracking cookies
• Analytics cookies (Google Analytics, Facebook Pixel, etc.)
• Third-party cookies from social networks`,
          },
          {
            title: 'Cookie consent',
            body: `Because we only use strictly necessary cookies required for the service to function, we are not required to obtain explicit cookie consent under most interpretations of Philippine law and common cookie regulations. No cookie banner is displayed because we have no non-essential cookies to consent to.`,
          },
          {
            title: 'Managing cookies',
            body: `You can delete cookies at any time through your browser settings. Deleting the session cookie will log you out of your PULSE account. You cannot use the authenticated parts of PULSE with cookies disabled.`,
          },
          {
            title: 'Contact',
            body: 'Cookie-related questions: privacy@nfc-pulse.app',
          },
        ].map(({ title, body }) => (
          <section key={title} className="space-y-3 border-t border-white/[0.06] pt-8">
            <h2 className="font-serif text-lg text-white">{title}</h2>
            <p className="text-[14px] text-white/50 leading-relaxed whitespace-pre-line">{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
