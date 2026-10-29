import { useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceService } from '../services/marketplace.service';
import { useToastStore } from '@/shared/store/ui/useToastStore';

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (data: any) => marketplaceService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-my-products'] });
      addToast({ type: 'success', message: 'Producto creado exitosamente' });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        message: error?.response?.data?.message || 'Error al crear el producto',
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => marketplaceService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-my-products'] });
      addToast({ type: 'success', message: 'Producto actualizado exitosamente' });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        message: error?.response?.data?.message || 'Error al actualizar el producto',
      });
    },
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ productId, rating, comment }: { productId: string; rating: number; comment?: string }) =>
      marketplaceService.createReview(productId, rating, comment),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-product', variables.productId] });
      addToast({ type: 'success', message: 'Reseña publicada exitosamente' });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        message: error?.response?.data?.message || 'Error al publicar la reseña',
      });
    },
  });
}

export function useRespondToReview() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ reviewId, response }: { reviewId: string; response: string }) =>
      marketplaceService.respondToReview(reviewId, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-product'] });
      addToast({ type: 'success', message: 'Respuesta enviada exitosamente' });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        message: error?.response?.data?.message || 'Error al responder la reseña',
      });
    },
  });
}
