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
        <header className="bg-black text-white py-4 shadow-md">
          <div className="max-w-7xl mx-auto px-4">
            {/* Header content */}
          </div>
        </header>
        <main className="py-6">
          {children}
        </main>
        <footer className="py-4 text-center text-black text-sm">
          © {getCurrentAustralianYear()} commercetools Dashboard
        </footer>
      </body>
    </html>
  );
}