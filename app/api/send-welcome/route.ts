import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, fullName, cardCode, slug } = await request.json();

    if (!email || !cardCode || !slug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nfc-pulse-wine.vercel.app';
    const profileUrl = `${appUrl}/p/${slug}`;
    const dashboardUrl = `${appUrl}/dashboard`;

    const { data, error } = await resend.emails.send({
      from: 'PULSE <onboarding@resend.dev>', // Update to your custom domain once verified in Resend
      to: [email],
      subject: `⚡ Hardware Pass ${cardCode} Activated!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>PULSE Hardware Pass Activated</title>
          </head>
          <body style="background-color: #000000; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; margin: 0;">
            <div style="max-w: 500px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #262626; border-radius: 20px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
              
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 20px; font-weight: 900; letter-spacing: 4px; color: #ffffff; text-transform: uppercase;">P U L S E</span>
                <p style="font-size: 11px; font-mono; color: #10b981; font-weight: 700; margin-top: 6px; letter-spacing: 1px;">HARDWARE PASS ACTIVATED</p>
              </div>

              <p style="font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 12px;">
                Welcome, ${fullName || 'Creator'}!
              </p>

              <p style="font-size: 14px; color: #a3a3a3; line-height: 1.6; margin-bottom: 24px;">
                Your physical hardware pass <strong style="color: #38bdf8; font-family: monospace;">${cardCode}</strong> has been successfully paired with your profile.
              </p>

              <div style="background-color: #171717; border: 1px solid #262626; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <p style="font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 1px;">Live Profile URL</p>
                <a href="${profileUrl}" style="font-size: 14px; color: #38bdf8; font-weight: 600; text-decoration: none; word-break: break-all;">${profileUrl}</a>
              </div>

              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${dashboardUrl}" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #ffffff; color: #000000; font-weight: 700; font-size: 14px; padding: 14px 24px; border-radius: 12px; text-decoration: none; text-align: center;">
                  Open Dashboard & Manage Links
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #262626; margin: 24px 0;" />

              <p style="font-size: 11px; color: #525252; text-align: center; margin: 0; font-family: monospace;">
                PULSE Hardware System &bull; Decoupled Tap Security
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}