export interface DialogLike {
  open: boolean;
  showModal(): void;
  close(): void;
}

export function applyDialogState(dialog: DialogLike, isOpen: boolean): void {
  if (isOpen) {
    if (!dialog.open) dialog.showModal();
    return;
  }

  if (dialog.open) dialog.close();
}
