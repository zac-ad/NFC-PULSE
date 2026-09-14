import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms & Conditions' };

const EFFECTIVE = 'September 14, 2026';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <div>
          <Link href="/" className="text-[12px] text-white/30 hover:text-white transition-colors">← Home</Link>
          <p className="font-mono text-[10px] text-white/25 tracking-widest mt-6 mb-3">LEGAL</p>
          <h1 className="font-serif text-4xl text-white">Terms &amp; Conditions</h1>
          <p className="text-[13px] text-white/30 mt-2">Effective {EFFECTIVE}</p>
        </div>

        {[
          {
            title: '1. Acceptance',
            body: 'By creating a PULSE account or using the PULSE service in any way, you agree to these Terms. If you do not agree, do not use the service.',
          },
          {
            title: '2. The service',
            body: 'PULSE provides a platform that links physical NFC cards to digital identity profiles. We reserve the right to modify, suspend, or discontinue the service at any time with reasonable notice.',
          },
          {
            title: '3. Your account',
            body: 'You are responsible for maintaining the security of your account. You must provide accurate information when creating a profile. You may not use PULSE to impersonate another person or organization. One physical card may only be linked to one profile at a time.',
          },
          {
            title: '4. Acceptable use',
            body: `You agree not to use PULSE to:
• Distribute false, misleading, or defamatory information.
• Impersonate any person or entity.
• Collect or harvest other users' data.
• Attempt to circumvent security controls or access systems without authorization.
• Violate any applicable Philippine law or regulation.`,
          },
          {
            title: '5. Content',
            body: 'You retain ownership of content you upload (photos, links, bio). By uploading content to PULSE, you grant us a limited license to display that content as part of the service. You are responsible for ensuring you have the right to use any content you upload.',
          },
          {
            title: '6. Cards and hardware',
            body: 'Physical NFC cards sold through PULSE are non-refundable once activated and linked to a profile. Cards are sold as-is. We do not warrant that cards will function with every device or operating system.',
          },
          {
            title: '7. Limitation of liability',
            body: 'To the maximum extent permitted by Philippine law, PULSE is not liable for indirect, incidental, special, or consequential damages arising from your use of the service. Our total liability for any claim shall not exceed the amount you paid us in the 30 days preceding the claim.',
          },
          {
            title: '8. Governing law',
            body: 'These Terms are governed by the laws of the Republic of the Philippines. Disputes shall be subject to the exclusive jurisdiction of the courts of the Philippines.',
          },
          {
            title: '9. Contact',
            body: 'Questions about these Terms: legal@nfc-pulse.app',
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
