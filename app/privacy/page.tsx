import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

const EFFECTIVE = 'September 14, 2026';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <div>
          <Link href="/" className="text-[12px] text-white/30 hover:text-white transition-colors">← Home</Link>
          <p className="font-mono text-[10px] text-white/25 tracking-widest mt-6 mb-3">LEGAL</p>
          <h1 className="font-serif text-4xl text-white">Privacy Policy</h1>
          <p className="text-[13px] text-white/30 mt-2">Effective {EFFECTIVE}</p>
        </div>

        {[
          {
            title: '1. Who we are',
            body: `PULSE ("we", "us", "our") is a digital identity platform that connects physical NFC cards to live profiles. PULSE is operated by Isaac Salasiban, an individual based in Calamba, Laguna, Philippines. PULSE is not currently registered as a business entity (DTI or SEC) — it is operated as a sole individual undertaking. For data concerns, contact pulse.companynfc@gmail.com.`,
          },
          {
            title: '2. What data we collect',
            body: `When you use PULSE, we collect:
• Account data: your email address, used for authentication.
• Profile data: name, job title, company, bio, phone number, profile photo, and social links you voluntarily provide.
• Tap telemetry: when someone taps your card, we log the approximate city, region, country, IP address, and browser user agent of the device performing the tap. This data is visible only to the card owner in their dashboard.
• Usage data: pages visited, error logs, and system performance data used to maintain the service.`,
          },
          {
            title: '3. How we use your data',
            body: `We use your data to:
• Provide, operate, and improve the PULSE service.
• Send authentication magic links to your email.
• Display tap analytics in your dashboard.
• Respond to support requests.
We do not sell your personal data to third parties. We do not use your data for advertising purposes.`,
          },
          {
            title: '4. Third-party services',
            body: `We use the following third-party services to operate PULSE:
• Supabase (database and authentication) — data stored in servers located in Singapore or the US depending on your project region.
• Resend (transactional email) — your email address is passed to Resend solely to send authentication and notification emails.
• Vercel (hosting and edge network) — request data is processed at Vercel edge nodes globally.
Each provider has its own privacy policy and data processing agreements.`,
          },
          {
            title: '5. Tap telemetry and IP addresses',
            body: `Every time someone taps your NFC card, we record the IP address, approximate city, region, and country of the device performing the tap. This data is used exclusively to provide you with tap analytics. We do not use this data for advertising or share it with third parties. IP addresses are stored as text and are not enriched beyond the city/region/country level.`,
          },
          {
            title: '6. Cookies',
            body: `PULSE uses cookies for authentication session management only. We do not use advertising cookies, tracking pixels, or third-party analytics cookies. See our Cookie Policy for full details.`,
          },
          {
            title: '7. Your rights (Philippines — Data Privacy Act of 2012)',
            body: `Under the Philippine Data Privacy Act of 2012 (Republic Act 10173) and its Implementing Rules and Regulations, you have the right to:
• Be informed of how your data is collected and used.
• Access a copy of your personal data.
• Correct inaccurate data.
• Object to or withdraw consent for data processing.
• Request erasure of your data from our systems.
• File a complaint with the National Privacy Commission (privacy.gov.ph).
To exercise any of these rights, email pulse.companynfc@gmail.com. We will respond within 15 business days.`,
          },
          {
            title: '8. Data retention',
            body: `We retain your account and profile data for as long as your account is active. Tap telemetry is retained for 12 months. You may request deletion of your account and all associated data at any time by emailing pulse.companynfc@gmail.com.`,
          },
          {
            title: '9. Children',
            body: `PULSE is not intended for use by persons under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has provided us with personal data, contact us immediately.`,
          },
          {
            title: '10. Changes to this policy',
            body: `We may update this policy periodically. We will notify registered users by email when material changes occur. Continued use of the service after changes constitutes acceptance of the updated policy.`,
          },
          {
            title: '11. Contact',
            body: `For any privacy-related concerns:\nEmail: pulse.companynfc@gmail.com\nOperated by: Isaac Salasiban\nLocation: Calamba, Laguna, Philippines`,
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
