'use client';

import { MarketplaceGuard } from '@/shared/components/guards/MarketplaceGuard';

export default function AdminMarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketplaceGuard requireAdmin>
      {children}
    </MarketplaceGuard>
  );
}
