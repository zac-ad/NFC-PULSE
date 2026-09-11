import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: 'PULSE | %s',
    default: 'PULSE — Business cards were made for paper.',
  },
  description: 'A living identity you carry in your wallet. One tap turns a physical interaction into a lasting digital connection.',
  openGraph: {
    title: 'PULSE — Business cards were made for paper.',
    description: 'A living identity you carry in your wallet.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-void text-paper antialiased">{children}</body>
    </html>
  );
}
