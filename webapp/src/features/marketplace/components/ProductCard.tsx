'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, FileText, Video, Star, ShoppingBag } from 'lucide-react';
import { MarketProduct, campaignService } from '../services/marketplace.service';

interface ProductCardProps {
  product: MarketProduct;
}

const typeLabels: Record<string, string> = {
  COURSE: 'Curso',
  EBOOK: 'Ebook',
  TEMPLATE: 'Plantilla',
  WEBINAR: 'Webinar',
};

const typeBadgeStyles: Record<string, string> = {
  COURSE: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  EBOOK: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  TEMPLATE: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  WEBINAR: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
};

export function ProductCard({ product }: ProductCardProps) {
  const handleClick = () => {
    campaignService.trackClickByProduct(product.id).catch(() => {});
  };

  const badgeStyle = typeBadgeStyles[product.type] || 'bg-base-200 text-base-content/70 border-base-300';

  return (
    <Link href={`/dashboard/marketplace/${product.id}`} onClick={handleClick} className="group block h-full">
      <div className="bg-base-100 rounded-2xl border border-base-300 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden">
        {/* Cover Image Header */}
        <div className="relative h-44 w-full bg-base-200 overflow-hidden">
          {product.coverUrl ? (
            <Image
              src={product.coverUrl}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-base-200 flex items-center justify-center text-base-content/40">
              {product.type === 'COURSE' && <BookOpen className="w-12 h-12 text-indigo-400" />}
              {product.type === 'EBOOK' && <BookOpen className="w-12 h-12 text-violet-400" />}
              {product.type === 'TEMPLATE' && <FileText className="w-12 h-12 text-emerald-400" />}
              {product.type === 'WEBINAR' && <Video className="w-12 h-12 text-sky-400" />}
            </div>
          )}
          <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md shadow-xs ${badgeStyle}`}>
            {typeLabels[product.type] || product.type}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
          <div className="space-y-2">
            {product.category && (
              <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-base-200 text-base-content/70">
                {product.category.name}
              </span>
            )}
            <h2 className="text-base font-bold text-base-content line-clamp-2 group-hover:text-primary transition-colors">
              {product.title}
            </h2>
            <p className="text-base-content/70 text-xs line-clamp-2 leading-relaxed">
              {product.description.replace(/<[^>]*>/g, '').substring(0, 110)}...
            </p>
          </div>

          <div className="pt-3 border-t border-base-200 space-y-3">
            {/* Seller Info */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {product.seller?.firstName?.[0]}{product.seller?.lastName?.[0]}
              </div>
              <span className="text-xs font-medium text-base-content/70 truncate">
                {product.seller?.firstName} {product.seller?.lastName}
              </span>
            </div>

            {/* Price & Rating */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-base-content font-bold">{Number(product.ratingAvg).toFixed(1)}</span>
                <span className="text-base-content/50 font-normal">({product.ratingCount})</span>
              </div>
              <span className="text-lg font-extrabold text-primary font-mono">
                ${Number(product.price).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
