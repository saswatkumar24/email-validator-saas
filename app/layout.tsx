import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TruthMail — Enterprise Email Validation SaaS',
  description: 'Clean your email lists with 99%+ deliverability guarantee. Detect spam traps, invalid MX, hard bounces, greymail, typos, and disposable emails.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
