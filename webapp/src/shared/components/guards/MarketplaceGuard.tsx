'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { sellerPermissionService } from '@/features/marketplace/services/marketplace.service';

interface MarketplaceGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  browseOnly?: boolean; // If true, only requires authentication (for catalog browsing)
}

export function MarketplaceGuard({ children, requireAdmin = false, browseOnly = false }: MarketplaceGuardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // If browseOnly mode, just allow authenticated users (catalog browsing)
    if (browseOnly) {
      setIsAllowed(true);
      return;
    }

    // Check if user has MARKET_SELLER permission (via sidebar items or API)
    const checkPermissions = async () => {
      try {
        // First check sidebar items for quick check
        const hasMarketplaceAccess = user?.permits?.list?.some(
          (p: string) => p === 'MARKET_SELLER' || p === 'MARKET_ADMIN_ACCESS'
        );

        if (hasMarketplaceAccess) {
          // If admin access required, verify via API
          if (requireAdmin) {
            const { isSeller } = await sellerPermissionService.checkSellerStatus();
            // For admin, we need MARKET_ADMIN_ACCESS - check via sidebar or API
            const hasAdminAccess = user?.permits?.list?.some(
              (p: string) => p === 'MARKET_ADMIN_ACCESS'
            ) ?? false;
            setIsAllowed(hasAdminAccess);
          } else {
            setIsAllowed(true);
          }
        } else {
          // Fallback: check via API
          const { isSeller } = await sellerPermissionService.checkSellerStatus();
          setIsAllowed(isSeller);
        }
      } catch (error) {
        console.error('Error checking marketplace permissions:', error);
        setIsAllowed(false);
      }
    };

    checkPermissions();
  }, [isAuthenticated, user, router, requireAdmin, browseOnly]);

  if (isAllowed === null) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-base-content">Acceso restringido</h2>
          <p className="text-base-content/60 mt-2">
            No tienes permisos para acceder a esta sección.
          </p>
          <p className="text-base-content/40 text-sm mt-1">
            Contacta al administrador para obtener permisos de vendedor.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => router.push('/dashboard')}
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
