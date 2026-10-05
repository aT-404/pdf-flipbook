import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDF Flipbook',
  description: 'Open any PDF as a flipbook. Two pages at a time, swipe to turn the pages.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark antialiased">
      <body className="min-h-screen bg-neutral-950 text-white selection:bg-amber-500 selection:text-neutral-950">
        {children}
      </body>
    </html>
  );
}
