// lib/parseDevice.ts
//
// Turns a raw user_agent string (already being stored on every card_taps
// row) into something a human can actually read at a glance — "iPhone ·
// Safari" instead of a 200-character string nobody wants to parse
// themselves. Deliberately simple: covers the common cases, falls back
// to "Unknown device" rather than guessing wrong.

export function parseDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Unknown device';
  const ua = userAgent;

  let device = 'Desktop';
  if (/iPhone/i.test(ua)) device = 'iPhone';
  else if (/iPad/i.test(ua)) device = 'iPad';
  else if (/Android/i.test(ua)) device = /Mobile/i.test(ua) ? 'Android phone' : 'Android tablet';
  else if (/Macintosh/i.test(ua)) device = 'Mac';
  else if (/Windows/i.test(ua)) device = 'Windows PC';
  else if (/Linux/i.test(ua)) device = 'Linux';

  let browser = '';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/CriOS/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  return browser ? `${device} · ${browser}` : device;
}
