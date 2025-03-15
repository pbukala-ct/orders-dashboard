// src/app/(dashboard)/discounts/page.tsx
'use client';

// Force a reimport of the component to ensure we get the latest version
import DiscountsViewer from '@/components/DiscountsViewer';

export default function DiscountsPage() {
  return (
    <>
      <DiscountsViewer />
    </>
  );
}