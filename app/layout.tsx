import './globals.css';

export const metadata = {
  title: {
    template: 'PULSE | %s',
    default: 'PULSE | Unified Live Share Experience',
  },
  description: 'Tap to view my digital business card and contact information.',
  openGraph: {
    title: 'PULSE | Unified Live Share Experience',
    description: 'Tap to view my digital business card and contact information.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}