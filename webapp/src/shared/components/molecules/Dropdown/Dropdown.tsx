import { cn } from '@/shared/lib/utils';
import { DropdownProps } from './Dropdown.types';

const positionMap = {
  end: 'dropdown-end',
  top: 'dropdown-top',
  bottom: 'dropdown-bottom',
  left: 'dropdown-left',
  right: 'dropdown-right',
};

export const Dropdown = ({
  trigger,
  children,
  position,
  hover = false,
  isOpen,
  menuClass = 'w-52',
  className,
  ...props
}: DropdownProps) => {
  return (
    <div
      className={cn(
        'dropdown', // Clase base DaisyUI
        position && positionMap[position],
        hover && 'dropdown-hover',
        isOpen && 'dropdown-open',
        className
      )}
      {...props}
    >
      {/* El Trigger necesita tabIndex para funcionar con foco en DaisyUI (versión CSS only) */}
      <div tabIndex={0} role="button" className="m-1">
        {trigger}
      </div>
      
      {/* Contenido del menú */}
      <ul
        tabIndex={0}
        className={cn(
          'dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box',
          menuClass
        )}
      >
        {children}
      </ul>
    </div>
  );
};