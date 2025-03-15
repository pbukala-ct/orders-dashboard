// // src/app/(dashboard)/page.tsx
// 'use client';

// import Dashboard from '@/components/Dashboard';

// export default function Home() {
//   return <Dashboard />;
// }

'use client';

import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <Dashboard />
    </main>
  );
}