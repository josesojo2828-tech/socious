'use client';

import { useEffect, useRef } from 'react';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { cn } from '@/shared/lib/utils';
import { applyDialogState } from './dialogLifecycle';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-full h-full m-0 rounded-none',
};

export const ModalRoot = () => {
  const { isOpen, view, options = {}, closeModal } = useModalStore();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;

    applyDialogState(d, isOpen);

    return () => {
      // `d` captured at setup — survives ref-nulling on unmount (top-layer release).
      applyDialogState(d, false);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!options.preventClose) closeModal();
    }
  };

  // D3 desync guard: browser close-request (Escape standards hook) — block the
  // native close and re-sync the store instead.
  const handleCancel = (e: React.FormEvent<HTMLDialogElement>) => {
    e.preventDefault();
    if (!options.preventClose) closeModal();
  };

  // D3 desync guard: dialog closed natively while the store still says open —
  // re-sync the store so the next showModal() cannot hit InvalidStateError.
  const handleClose = () => {
    if (isOpen) closeModal();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLElement>) => {
    if (options.preventClose) return;

    const modalBox = dialogRef.current?.querySelector('.modal-box');
    if (modalBox && !modalBox.contains(e.target as Node)) {
      closeModal();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom md:modal-middle backdrop:bg-black/50 backdrop:backdrop-blur-sm transition-all duration-300"
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
      onCancel={handleCancel}
      onClose={handleClose}
    >
      <div
        className={cn(
          'modal-box relative w-full overflow-hidden max-h-[90vh] md:max-h-[85vh] overflow-y-auto',
          'bg-base-100 text-base-content',
          'border border-base-300',
          'shadow-2xl shadow-slate-950/25',
          'rounded-t-3xl rounded-b-none md:rounded-3xl p-6 md:p-8',
          'transition-all duration-200 animate-in fade-in zoom-in-95',
          sizeClasses[options.size || 'md'],
          options.className
        )}
      >
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

        {/* Mobile handle indicator */}
        <div className="flex justify-center md:hidden pb-3">
          <div className="w-12 h-1.5 bg-base-300 rounded-full opacity-80" />
        </div>

        {view}
      </div>

      <div
        className="modal-backdrop bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={handleBackdropClick}
      />
    </dialog>
  );
};