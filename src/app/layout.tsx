import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0f6b6b',
};

export const metadata: Metadata = {
  title: 'Kashef — Probabilistic AI Authorship & Document Integrity Platform',
  description:
    'An evidence-grounded AI text estimation platform utilizing statistical proxy signals, language model classification, and transparent per-paragraph signal breakdown.',
  applicationName: 'Kashef',
  authors: [{ name: 'Dr. Raouf Roshdy', url: 'https://github.com/roroleaks' }],
  icons: {
    icon: '/favicon.ico',
    apple: '/dr-raouf.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="scroll-smooth">
      <body className="bg-[#f6f8fa] text-[#1a2332] min-h-screen flex flex-col">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal-700 focus:text-white focus:rounded-md focus:shadow-md"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
