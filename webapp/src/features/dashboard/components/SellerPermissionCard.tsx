'use client';

import { useState, useEffect } from 'react';
import { sellerPermissionService } from '@/features/marketplace/services/marketplace.service';
import { Store, Check, X, Loader2 } from 'lucide-react';

interface SellerPermissionCardProps {
  userId: string;
  onStatusUpdated?: () => void;
}

export function SellerPermissionCard({ userId, onStatusUpdated }: SellerPermissionCardProps) {
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [userId]);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const status = await sellerPermissionService.isSeller(userId);
      setIsSeller(status.isSeller);
    } catch (error) {
      console.error('Error checking seller status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      setToggleLoading(true);
      if (isSeller) {
        await sellerPermissionService.revokeSellerPermission(userId);
      } else {
        await sellerPermissionService.grantSellerPermission(userId);
      }
      setIsSeller(!isSeller);
      onStatusUpdated?.();
    } catch (error) {
      console.error('Error toggling seller permission:', error);
    } finally {
      setToggleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
          <span className="text-slate-500 dark:text-slate-400">Cargando estado de vendedor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Store size={18} className="text-slate-400 dark:text-slate-500" />
        <h3 className="font-bold text-slate-900 dark:text-slate-100">Marketplace - Vendedor</h3>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {isSeller
                ? 'Este usuario tiene permisos de vendedor en el marketplace'
                : 'Este usuario NO tiene permisos de vendedor'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">
              {isSeller
                ? 'Puede crear productos y activar campañas publicitarias'
                : 'Activar para permitir crear productos y campañas'}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={toggleLoading}
            className={`btn btn-sm ${
              isSeller ? 'btn-error' : 'btn-success'
            }`}
          >
            {toggleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSeller ? (
              <>
                <X size={16} /> Revocar
              </>
            ) : (
              <>
                <Check size={16} /> Otorgar
              </>
            )}
          </button>
        </div>
        
        {isSeller && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              ✓ Permiso de vendedor activo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}