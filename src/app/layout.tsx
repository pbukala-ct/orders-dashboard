import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Commercetools Orders Dashboard',
  description: 'Real-time orders dashboard for Commercetools',
};

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
            {/* <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-ct-violet rounded-md p-1.5">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 6H21V8H3V6ZM3 11H21V13H3V11ZM3 16H21V18H3V16Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <span className="font-semibold text-lg">Orders Dashboard</span>
              </div>
              <div className="text-sm text-white">
                Powered by <span className="font-medium text-ct-teal">commercetools</span>
              </div>
            </div> */}
          </div>
        </header>
        <main className="py-6">
          {children}
        </main>
        <footer className="py-4 text-center text-black text-sm">
          © {new Date().getFullYear()} commercetools Dashboard
        </footer>
      </body>
    </html>
  );
}