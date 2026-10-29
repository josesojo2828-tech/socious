import { cn } from '@/shared/lib/utils';
import { DrawerProps } from './Drawer.types';

export const Drawer = ({
  id,
  children,
  sideContent,
  position = 'start',
  isOpen,
  onClose,
  className,
  sideClassName,
}: DrawerProps) => {
  
  // Determinamos si es controlado o no controlado
  const isControlled = isOpen !== undefined;

  return (
    <div 
      className={cn(
        'drawer', // Clase base
        position === 'end' && 'drawer-end', // Modificador derecha
        className
      )}
    >
      {/* INPUT TOGGLE (El cerebro del Drawer)
          - Si es controlado: usa 'checked' y 'onChange'
          - Si es nativo: usa solo 'id'
      */}
      <input 
        id={id} 
        type="checkbox" 
        className="drawer-toggle" 
        checked={isControlled ? isOpen : undefined}
        onChange={isControlled ? onClose : undefined} // Al cambiar, invoca cierre
      />
      
      {/* CONTENIDO PRINCIPAL */}
      <div className="drawer-content flex flex-col">
        {children}
      </div> 
      
      {/* PANEL LATERAL */}
      <div className="drawer-side z-50">
        {/* Overlay (Fondo oscuro) - DaisyUI lo maneja con este label */}
        <label 
          htmlFor={id} 
          aria-label="close sidebar" 
          className="drawer-overlay bg-black/50 backdrop-blur-xs"
          onClick={isControlled ? onClose : undefined}
        ></label>
        
        {/* Contenido del Sidebar */}
        <div 
          className={cn(
            'p-4 w-80 h-screen max-h-screen overflow-y-auto bg-base-200 text-base-content', // Estilos default robustos
            sideClassName
          )}
        >
          {sideContent}
        </div>
      </div>
    </div>
  );
};