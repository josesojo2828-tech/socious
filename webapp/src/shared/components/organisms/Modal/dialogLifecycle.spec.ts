import { describe, it, expect, vi } from 'vitest';
import { applyDialogState, type DialogLike } from './dialogLifecycle';

type FakeDialog = DialogLike & {
  showModal: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

const createFakeDialog = (open = false): FakeDialog => {
  const dialog: FakeDialog = {
    open,
    showModal: vi.fn(() => {
      dialog.open = true;
    }),
    close: vi.fn(() => {
      dialog.open = false;
    }),
  };
  return dialog;
};

describe('applyDialogState', () => {
  describe('pairing', () => {
    it('llama showModal() solo cuando isOpen=true y el dialog está cerrado', () => {
      const dialog = createFakeDialog(false);

      applyDialogState(dialog, true);

      expect(dialog.showModal).toHaveBeenCalledTimes(1);
      expect(dialog.close).not.toHaveBeenCalled();
      expect(dialog.open).toBe(true);
    });

    it('NO llama showModal() si el dialog ya está abierto', () => {
      const dialog = createFakeDialog(true);

      applyDialogState(dialog, true);

      expect(dialog.showModal).not.toHaveBeenCalled();
      expect(dialog.close).not.toHaveBeenCalled();
    });

    it('llama close() solo cuando isOpen=false y el dialog está abierto', () => {
      const dialog = createFakeDialog(true);

      applyDialogState(dialog, false);

      expect(dialog.close).toHaveBeenCalledTimes(1);
      expect(dialog.showModal).not.toHaveBeenCalled();
      expect(dialog.open).toBe(false);
    });

    it('NO llama close() si el dialog ya está cerrado', () => {
      const dialog = createFakeDialog(false);

      applyDialogState(dialog, false);

      expect(dialog.close).not.toHaveBeenCalled();
      expect(dialog.showModal).not.toHaveBeenCalled();
    });
  });

  describe('cleanup (elemento capturado `d`)', () => {
    it('el cleanup cierra un dialog abierto capturado, aunque el ref ya no apunte a él', () => {
      const captured = createFakeDialog(false);

      applyDialogState(captured, true);
      expect(captured.open).toBe(true);

      // Simula effect cleanup: usa el elemento capturado al setup, no el ref actual.
      applyDialogState(captured, false);

      expect(captured.close).toHaveBeenCalledTimes(1);
      expect(captured.open).toBe(false);
    });
  });

  describe('idempotencia', () => {
    it('aplicar el mismo estado dos veces no duplica llamadas', () => {
      const openDialog = createFakeDialog(false);
      applyDialogState(openDialog, true);
      applyDialogState(openDialog, true);
      expect(openDialog.showModal).toHaveBeenCalledTimes(1);
      expect(openDialog.close).not.toHaveBeenCalled();

      const closedDialog = createFakeDialog(true);
      applyDialogState(closedDialog, false);
      applyDialogState(closedDialog, false);
      expect(closedDialog.close).toHaveBeenCalledTimes(1);
      expect(closedDialog.showModal).not.toHaveBeenCalled();
    });

    it('alternar open→close→open vuelve a llamar showModal()', () => {
      const dialog = createFakeDialog(false);

      applyDialogState(dialog, true);
      applyDialogState(dialog, false);
      applyDialogState(dialog, true);

      expect(dialog.showModal).toHaveBeenCalledTimes(2);
      expect(dialog.close).toHaveBeenCalledTimes(1);
      expect(dialog.open).toBe(true);
    });
  });
});
