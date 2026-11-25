import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export interface SendActivationVerificationEmailParams {
  to: string;
  fullName: string;
  verificationUrl: string;
  expiresInMinutes?: number;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

function buildActivationEmailHtml(fullName: string, verificationUrl: string, expiresInMinutes: number): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111;">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Verify your email and activate your card</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #444;">Hi ${fullName},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #444;">
        Thanks for choosing PULSE. To verify your email address and activate your card, please click the button below within the next ${expiresInMinutes} minutes:
      </p>
      <div style="margin: 28px 0;">
        <a href="${verificationUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; display: inline-block;">
          Verify email and activate card
        </a>
      </div>
      <p style="font-size: 12px; line-height: 1.5; color: #777;">
        If you did not request this card activation, you can safely ignore this email. This link is single-use and will expire in ${expiresInMinutes} minutes.
      </p>
    </div>
  `;
}

export async function sendActivationVerificationEmail({
  to,
  fullName,
  verificationUrl,
  expiresInMinutes = 30,
}: SendActivationVerificationEmailParams): Promise<SendEmailResult> {
  const subject = 'Verify your email to activate your PULSE card';
  const html = buildActivationEmailHtml(fullName, verificationUrl, expiresInMinutes);

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.ACTIVATION_EMAIL_FROM?.trim() || process.env.EMAIL_FROM?.trim();

  // 1. Resend provider
  if (apiKey && fromEmail) {
    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
      });

      if (error) {
        console.error('Resend email error:', error.message);
        return { success: false, error: 'Could not send verification email.' };
      }

      return { success: true, messageId: data?.id };
    } catch (err) {
      console.error('Failed to send activation email via Resend:', err instanceof Error ? err.message : err);
      return { success: false, error: 'Could not send verification email.' };
    }
  }

  // 2. Gmail / SMTP fallback
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (smtpUser && smtpPass) {
    try {
      const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
      const smtpPort = Number(process.env.SMTP_PORT || 465);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: fromEmail || `PULSE <${smtpUser}>`,
        to,
        subject,
        html,
      });

      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('Failed to send activation email via SMTP:', err instanceof Error ? err.message : err);
      return { success: false, error: 'Could not send verification email.' };
    }
  }

  // 3. Safe simulation when no email provider is configured
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[activation-email:simulated] To: ${to}, URL: ${verificationUrl}`);
  }
  return { success: true, simulated: true };
}
