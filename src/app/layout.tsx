import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ACME Issue Tracker',
  description: 'Minimal issue tracker MVP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
