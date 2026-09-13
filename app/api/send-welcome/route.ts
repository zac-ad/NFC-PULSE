import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured.' }, { status: 503 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { email, fullName, cardCode, slug } = await request.json();
    if (!email || !cardCode || !slug) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    await resend.emails.send({
      from: 'PULSE <no-reply@nfc-pulse.app>',
      to: email,
      subject: 'Your PULSE card is active.',
      html: `<p>Hi ${fullName || 'there'},</p>
<p>Your PULSE card <strong>${cardCode}</strong> is now active.</p>
<p>Your live profile: <a href="https://nfc-pulse-wine.vercel.app/p/${slug}">nfc-pulse-wine.vercel.app/p/${slug}</a></p>
<p>— PULSE</p>`,
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
