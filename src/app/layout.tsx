// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Commercetools Orders Dashboard',
  description: 'Real-time orders dashboard for Commercetools',
};

// Function to get the current year in Australian timezone
function getCurrentAustralianYear() {
  return new Intl.DateTimeFormat('en-AU', { 
    timeZone: 'Australia/Sydney',
    year: 'numeric'
  }).format(new Date());
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-ct-earth/20`}>
        {children}
        <div className="fixed bottom-0 left-0 right-0 py-2 text-center text-black text-xs border-t border-gray-200 bg-white">
          © {getCurrentAustralianYear()} commercetools Dashboard
        </div>
      </body>
    </html>
  );
}