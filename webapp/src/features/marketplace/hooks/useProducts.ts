import { useQuery } from '@tanstack/react-query';
import { marketplaceService, ProductFilters } from '../services/marketplace.service';

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ['marketplace-products', filters],
    queryFn: () => marketplaceService.getProducts(filters),
    staleTime: 30000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['marketplace-product', id],
    queryFn: () => marketplaceService.getProduct(id),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['marketplace-categories'],
    queryFn: () => marketplaceService.getCategories(),
    staleTime: 60000,
  });
}

export function useMyProducts() {
  return useQuery({
    queryKey: ['marketplace-my-products'],
    queryFn: () => marketplaceService.getMyProducts(),
  });
}
