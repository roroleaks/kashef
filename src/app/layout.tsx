import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1a5c8a',
};

export const metadata: Metadata = {
  title: 'Kashef — Probabilistic AI Authorship & Document Integrity Platform',
  description:
    'An evidence-grounded AI text estimation platform utilizing statistical proxy signals, language model classification, and transparent per-paragraph signal breakdown.',
  applicationName: 'Kashef',
  authors: [{ name: 'Dr. Raouf Roshdy', url: 'https://github.com/roroleaks' }],
  icons: {
    icon: '/favicon.ico',
    apple: '/app-icon.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="scroll-smooth">
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] min-h-screen flex flex-col font-sans">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1a5c8a] focus:text-white focus:rounded-md focus:shadow-md"
        >
          Skip to main content
        </a>
        <div id="main-content" className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
