// src/app/(dashboard)/layout.tsx
import Navigation from '@/components/Navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Navigation />
      <div className="flex-1 overflow-auto">
        <header className="bg-white py-4 px-6 shadow-sm border-b">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-xl font-bold text-black">Commercetools Analytics</h1>
          </div>
        </header>
        <div className="py-6 px-6">
          {children}
        </div>
      </div>
    </div>
  );
}