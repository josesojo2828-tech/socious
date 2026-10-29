'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useProduct } from '@/features/marketplace/hooks/useProducts';
import { ReviewSection } from '@/features/marketplace/components/ReviewSection';
import { CampaignSelector } from '@/features/marketplace/components/CampaignSelector';
import { campaignService, walletPaymentService } from '@/features/marketplace/services/marketplace.service';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { BookOpen, FileText, Video, Star, ArrowLeft, ExternalLink, Tag, Megaphone, CheckCircle2, Mail, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

const typeLabels: Record<string, string> = { COURSE: 'Curso', EBOOK: 'Ebook', TEMPLATE: 'Plantilla', WEBINAR: 'Webinar' };
const typeIcons: Record<string, any> = { COURSE: BookOpen, EBOOK: BookOpen, TEMPLATE: FileText, WEBINAR: Video };

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const { data: product, isLoading, error } = useProduct(productId);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  // Fetch wallet balance
  const { data: walletData } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => walletPaymentService.getBalance(),
  });

  // Fetch campaign status
  const { data: campaignStatus } = useQuery({
    queryKey: ['campaign-status', productId],
    queryFn: () => campaignService.getProductCampaignStatus(productId),
    enabled: !!productId,
  });

  // Track impression when product with active campaign is viewed
  useEffect(() => {
    if (campaignStatus?.hasActiveCampaign) {
      campaignService.trackImpressionByProduct(productId).catch(() => {});
    }
  }, [campaignStatus, productId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-base-100 rounded-3xl border border-base-300 shadow-xs">
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-3" />
        <span className="text-sm font-semibold text-base-content/80">Cargando detalles del recurso...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-3xl flex items-center gap-3 text-sm shadow-xs">
        <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0" />
        <div>
          <h4 className="font-bold">Producto no encontrado</h4>
          <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">El recurso solicitado no existe o fue desactivado por el autor.</p>
        </div>
      </div>
    );
  }

  const TypeIcon = typeIcons[product.type] || FileText;
  const hasActiveCampaign = campaignStatus?.hasActiveCampaign ?? false;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 font-sans text-base-content/80">
      {/* Header Navigation & Campaign CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-4 rounded-2xl border border-base-300 shadow-xs">
        <Link
          href="/dashboard/marketplace/products"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-base-content/80 hover:text-base-content bg-base-200 hover:bg-base-300 rounded-xl transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft size={16} /> Volver a mis productos
        </Link>

        {!hasActiveCampaign && product.status === 'PUBLISHED' && (
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            onClick={() => setShowCampaignSelector(true)}
          >
            <Megaphone size={16} /> Activar Campaña Promocional
          </button>
        )}

        {hasActiveCampaign && (
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" /> Campaña Activa
          </span>
        )}
      </div>

      {/* Campaign Selector Modal */}
      {showCampaignSelector && (
        <CampaignSelector
          productId={product.id}
          productName={product.title}
          currentBalance={walletData?.balance || 0}
          onClose={() => setShowCampaignSelector(false)}
          onActivated={() => {
            queryClient.invalidateQueries({ queryKey: ['campaign-status', productId] });
            queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
            setShowCampaignSelector(false);
            addToast({ type: 'success', message: 'Campaña activada exitosamente' });
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cover Image Banner */}
          <div className="relative aspect-video bg-base-200 rounded-3xl overflow-hidden border border-base-300 shadow-sm">
            {product.coverUrl ? (
              <Image src={product.coverUrl} alt={product.title} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-base-200">
                <TypeIcon className="w-20 h-20 text-indigo-400/50 mb-2" />
                <span className="text-xs font-medium text-base-content/60">Recurso Digital</span>
              </div>
            )}
          </div>

          {/* Title and badges */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <TypeIcon size={14} /> {typeLabels[product.type]}
              </span>
              {product.category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-base-200 text-base-content/80 border border-base-300">
                  {product.category.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-base-content leading-snug">{product.title}</h1>
          </div>

          {/* Description Card */}
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-xs p-6 space-y-4">
            <h2 className="text-base font-bold text-base-content flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Descripción General
            </h2>
            <div className="prose dark:prose-invert prose-sm max-w-none text-base-content/80 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          </div>

          {/* Tags Card */}
          {product.tags.length > 0 && (
            <div className="bg-base-100 rounded-3xl border border-base-300 shadow-xs p-6 space-y-3">
              <h2 className="text-base font-bold text-base-content flex items-center gap-2">
                <Tag size={18} className="text-indigo-600 dark:text-indigo-400" /> Etiquetas
              </h2>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, index) => (
                  <span key={index} className="px-3 py-1 rounded-xl text-xs font-medium bg-base-200 text-base-content/80 border border-base-300">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Price card */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-3">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Precio Comercial</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold font-mono">${Number(product.price).toFixed(2)}</span>
              <span className="text-sm font-semibold text-indigo-200">{product.currency || 'USD'}</span>
            </div>
            <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-xs text-indigo-100 font-medium">
              <ShieldCheck className="w-4 h-4 text-indigo-300" /> Pago seguro garantizado por Nutringest
            </div>
          </div>

          {/* Seller card */}
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-xs p-6 space-y-4">
            <h3 className="text-xs font-bold text-base-content/60 uppercase tracking-wider">Autor del Recurso</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                {product.seller.firstName?.[0]}{product.seller.lastName?.[0]}
              </div>
              <div>
                <p className="font-bold text-base-content text-sm">{product.seller.firstName} {product.seller.lastName}</p>
                <p className="text-xs text-base-content/60">Nutricionista Registrado</p>
              </div>
            </div>

            <div className="pt-3 border-t border-base-300 space-y-2">
              <span className="text-xs font-bold text-base-content/60 uppercase tracking-wider">Contacto</span>
              {product.seller.email ? (
                <a
                  href={`mailto:${product.seller.email}`}
                  className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
                >
                  <Mail size={14} /> {product.seller.email}
                </a>
              ) : (
                <p className="text-xs text-base-content/60">Sin información de contacto público</p>
              )}
            </div>
          </div>

          {/* Rating card */}
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-xs p-6 space-y-3">
            <h3 className="text-xs font-bold text-base-content/60 uppercase tracking-wider">Valoración General</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
                <span className="text-2xl font-extrabold text-base-content font-mono">{Number(product.ratingAvg).toFixed(1)}</span>
              </div>
              <div className="text-xs text-base-content/60 font-medium">
                ({product.ratingCount} reseñas verificadas)
              </div>
            </div>
          </div>

          {/* Preview button */}
          {product.previewUrl && (
            <a
              href={product.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors shadow-xs"
            >
              <ExternalLink size={16} /> Ver Previsualización
            </a>
          )}
        </div>

        {/* Reviews section - full width */}
        <div className="lg:col-span-3">
          <ReviewSection
            productId={product.id}
            reviews={product.reviews || []}
            sellerId={product.seller.id}
          />
        </div>
      </div>
    </div>
  );
}
