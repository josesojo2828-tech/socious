import { describe, it, expect, beforeEach } from 'vitest';
import { useModalStore } from './useModalStore';

const initialState = () => ({
  isOpen: false,
  view: null,
  options: {},
});

describe('useModalStore', () => {
  beforeEach(() => {
    useModalStore.setState(initialState());
  });

  describe('estado inicial', () => {
    it('arranca cerrado, sin view y con options vacías', () => {
      const state = useModalStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.view).toBeNull();
      expect(state.options).toEqual({});
    });
  });

  describe('openModal', () => {
    it('abre el modal y asigna el view recibido', () => {
      useModalStore.getState().openModal('view-a');

      const state = useModalStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.view).toBe('view-a');
    });

    it('sin options asigna {} (nunca undefined)', () => {
      useModalStore.getState().openModal('view-a');

      expect(useModalStore.getState().options).toEqual({});
    });

    it('guarda las options recibidas', () => {
      useModalStore.getState().openModal('view-a', {
        preventClose: true,
        size: 'lg',
        className: 'custom-modal',
      });

      expect(useModalStore.getState().options).toEqual({
        preventClose: true,
        size: 'lg',
        className: 'custom-modal',
      });
    });

    it('re-abrir reemplaza view y options (no acumula estado anterior)', () => {
      useModalStore.getState().openModal('view-a', { preventClose: true, size: 'sm' });
      useModalStore.getState().openModal('view-b');

      const state = useModalStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.view).toBe('view-b');
      expect(state.options).toEqual({});
    });

    it('permanece abierto si se llama openModal estando abierto', () => {
      useModalStore.getState().openModal('view-a');
      useModalStore.getState().openModal('view-b');

      expect(useModalStore.getState().isOpen).toBe(true);
    });
  });

  describe('closeModal', () => {
    it('cierra el modal y limpia view y options', () => {
      useModalStore.getState().openModal('view-a', { preventClose: true, size: 'md' });
      useModalStore.getState().closeModal();

      const state = useModalStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.view).toBeNull();
      expect(state.options).toEqual({});
    });

    it('es idempotente: cerrar dos veces deja el mismo estado', () => {
      useModalStore.getState().openModal('view-a');
      useModalStore.getState().closeModal();
      useModalStore.getState().closeModal();

      const { isOpen, view, options } = useModalStore.getState();
      expect({ isOpen, view, options }).toEqual(initialState());
    });
  });

  describe('semántica open/close (ciclo de vida)', () => {
    it('ciclo open → close → open vuelve a abrir con el nuevo view', () => {
      const store = useModalStore.getState();

      store.openModal('view-a');
      expect(useModalStore.getState().isOpen).toBe(true);

      store.closeModal();
      expect(useModalStore.getState().isOpen).toBe(false);
      expect(useModalStore.getState().view).toBeNull();

      store.openModal('view-b');
      const state = useModalStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.view).toBe('view-b');
    });

    it('no existe toggle en la API pública (solo openModal/closeModal)', () => {
      const state = useModalStore.getState() as unknown as Record<string, unknown>;

      expect(typeof state.openModal).toBe('function');
      expect(typeof state.closeModal).toBe('function');
      expect('toggle' in state).toBe(false);
    });
  });

  describe('preventClose (solo datos a nivel store)', () => {
    it('closeModal NO respeta preventClose: limpia igual el estado', () => {
      // Caracterización: el store persiste preventClose como dato;
      // el enforcement vive en Modal.tsx (onCancel/backdrop/Escape).
      useModalStore.getState().openModal('view-a', { preventClose: true });
      useModalStore.getState().closeModal();

      const state = useModalStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.options).toEqual({});
    });

    it('openModal sin options resetea preventClose a ausente', () => {
      useModalStore.getState().openModal('view-a', { preventClose: true });
      useModalStore.getState().openModal('view-b');

      expect(useModalStore.getState().options).toEqual({});
      expect(useModalStore.getState().options?.preventClose).toBeUndefined();
    });
  });

  describe('subscribe', () => {
    it('notifica el nuevo estado en openModal y closeModal', () => {
      const seen: Array<{ isOpen: boolean; view: unknown }> = [];
      const unsubscribe = useModalStore.subscribe((state) => {
        seen.push({ isOpen: state.isOpen, view: state.view });
      });

      useModalStore.getState().openModal('view-a');
      useModalStore.getState().closeModal();
      unsubscribe();

      expect(seen).toHaveLength(2);
      expect(seen[0]).toEqual({ isOpen: true, view: 'view-a' });
      expect(seen[1]).toEqual({ isOpen: false, view: null });
    });

    it('el unsubscribe detiene las notificaciones', () => {
      let calls = 0;
      const unsubscribe = useModalStore.subscribe(() => {
        calls += 1;
      });
      unsubscribe();

      useModalStore.getState().openModal('view-a');

      expect(calls).toBe(0);
    });
  });
});
