// src/app/(dashboard)/discounts/page.tsx
'use client';

import { Suspense } from 'react';
import DiscountsViewer from '@/components/DiscountsViewer';

export default function DiscountsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#6359ff] animate-spin"></div></div>}>
      <DiscountsViewer />
    </Suspense>
  );
}