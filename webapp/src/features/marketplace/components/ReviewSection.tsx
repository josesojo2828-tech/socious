'use client';

import { useState } from 'react';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { useCreateReview, useRespondToReview } from '../hooks/useMutations';
import { marketplaceService } from '../services/marketplace.service';
import type { MarketReview } from '../services/marketplace.service';

interface ReviewSectionProps {
  productId: string;
  reviews: MarketReview[];
  sellerId: string;
}

export function ReviewSection({ productId, reviews, sellerId }: ReviewSectionProps) {
  const { user } = useAuthStore();
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const createReview = useCreateReview();
  const respondToReview = useRespondToReview();

  const handleSubmitReview = () => {
    if (!newComment.trim()) return;
    createReview.mutate(
      { productId, rating: newRating, comment: newComment },
      {
        onSuccess: () => {
          setNewComment('');
          setNewRating(5);
        },
      }
    );
  };

  const handleRespond = (reviewId: string) => {
    if (!responseText.trim()) return;
    respondToReview.mutate(
      { reviewId, response: responseText },
      {
        onSuccess: () => {
          setRespondingTo(null);
          setResponseText('');
        },
      }
    );
  };

  const isSeller = user?.id === sellerId;
  const hasPurchased = reviews.some((r) => r.buyerId === user?.id);
  const canReview = user && !isSeller && !hasPurchased;

  return (
    <div className="mt-8 space-y-6">
      <h3 className="text-lg font-bold">Reseñas ({reviews.length})</h3>

      {/* Review Form */}
      {canReview && (
        <div className="card bg-base-200">
          <div className="card-body">
            <h4 className="card-title text-sm">Dejá tu reseña</h4>
            <div className="rating rating-lg">
              {[1, 2, 3, 4, 5].map((star) => (
                <input
                  key={star}
                  type="radio"
                  name="rating"
                  className="mask mask-star-2 bg-orange-400"
                  checked={newRating === star}
                  onChange={() => setNewRating(star)}
                />
              ))}
            </div>
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Contanos tu experiencia..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <div className="card-actions justify-end">
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSubmitReview}
                disabled={createReview.isPending || !newComment.trim()}
              >
                {createReview.isPending ? 'Publicando...' : 'Publicar reseña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 && (
          <p className="text-sm text-base-content/50 text-center py-4">
            Aún no hay reseñas. Sé el primero en opinar.
          </p>
        )}
        {reviews.map((review) => (
          <div key={review.id} className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <div className="flex items-center gap-3">
                <div className="avatar placeholder">
                  <div className="bg-neutral text-neutral-content rounded-full w-8">
                    <span className="text-xs">
                      {review.buyer.firstName?.[0] || '?'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {review.buyer.firstName} {review.buyer.lastName}
                  </p>
                  <div className="rating rating-sm">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <input
                        key={star}
                        type="radio"
                        className="mask mask-star-2 bg-orange-400"
                        checked={review.rating === star}
                        readOnly
                      />
                    ))}
                  </div>
                </div>
              </div>
              {review.comment && (
                <p className="text-sm mt-2">{review.comment}</p>
              )}

              {/* Seller Response */}
              {review.response && (
                <div className="bg-base-200 rounded-lg p-3 mt-3">
                  <p className="text-xs font-bold text-base-content/60 mb-1">
                    Respuesta del vendedor:
                  </p>
                  <p className="text-sm">{review.response}</p>
                </div>
              )}

              {/* Respond Button for Seller */}
              {isSeller && !review.response && (
                <div className="mt-3">
                  {respondingTo === review.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input input-bordered input-sm flex-1"
                        placeholder="Tu respuesta..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRespond(review.id)}
                        disabled={respondToReview.isPending}
                      >
                        Enviar
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setRespondingTo(null); setResponseText(''); }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost btn-xs text-primary"
                      onClick={() => setRespondingTo(review.id)}
                    >
                      Responder
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
