"use client";

import { useModalStore } from "@/shared/store/ui/useModalStore";
import { ProductImportPanel } from "./ProductImportPanel";

/**
 * Modal wrapper around the CSV import panel (catalog quick action). The panel
 * owns the flow; this file only adds the modal lifecycle so the same UI can be
 * mounted on the dedicated import page.
 */

export interface ProductImportModalProps {
  onClose: () => void;
  /** Called after a successful commit so the catalog reloads. */
  onSuccess: () => void;
}

export function ProductImportModal({
  onClose,
  onSuccess,
}: ProductImportModalProps) {
  const { closeModal } = useModalStore();

  const close = () => {
    closeModal();
    onClose();
  };

  return (
    <ProductImportPanel
      onClose={close}
      onSuccess={() => {
        onSuccess();
        close();
      }}
    />
  );
}
