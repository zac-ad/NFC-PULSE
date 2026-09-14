import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Refund Policy' };

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <div>
          <Link href="/" className="text-[12px] text-white/30 hover:text-white transition-colors">← Home</Link>
          <p className="font-mono text-[10px] text-white/25 tracking-widest mt-6 mb-3">LEGAL</p>
          <h1 className="font-serif text-4xl text-white">Refund Policy</h1>
        </div>

        {[
          {
            title: 'Physical NFC cards',
            body: `Because each card is manufactured, paired, and encoded specifically for your profile, we do not accept returns or offer refunds on physical cards once they have been activated and linked to a profile.

If your card arrives damaged or defective, contact us within 7 days of receiving it at support@nfc-pulse.app with a photo of the defect. We will replace defective cards at no charge.`,
          },
          {
            title: 'Service subscriptions',
            body: `If PULSE introduces paid subscription tiers in the future, refund terms will be stated clearly at the point of purchase and updated in this policy. Currently, PULSE does not charge a subscription fee.`,
          },
          {
            title: 'Consumer rights (Philippines)',
            body: `Under Republic Act 7394 (Consumer Act of the Philippines), you have the right to a replacement or refund for defective goods. This policy does not limit those rights. If you believe your rights under Philippine consumer law have not been met, you may file a complaint with the Department of Trade and Industry (DTI).`,
          },
          {
            title: 'Contact',
            body: 'Refund or defect claims: support@nfc-pulse.app',
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
