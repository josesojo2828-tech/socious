import { cn } from '@/shared/lib/utils';
import { Text } from '@/shared/components/atoms/Text';
import { AccordionProps } from './Accordion.types';

const variantMap = {
  arrow: 'collapse-arrow',
  plus: 'collapse-plus',
};

export const Accordion = ({
  items,
  behavior = 'single',
  variant = 'arrow',
  name = 'accordion-group',
  joined = false,
  className,
}: AccordionProps) => {
  
  // Si usamos estilo 'joined', aplicamos las clases de DaisyUI .join
  const containerClasses = cn(
    joined ? 'join join-vertical w-full' : 'flex flex-col gap-2',
    className
  );

  return (
    <div className={containerClasses}>
      {items.map((item) => {
        
        // Clases para cada ítem individual
        const itemClasses = cn(
          'collapse bg-base-200 border border-base-300',
          variantMap[variant],
          joined && 'join-item rounded-none first:rounded-t-lg last:rounded-b-lg border-b-0 last:border-b'
        );

        return (
          <div key={item.id} className={itemClasses}>
            {/* La magia de DaisyUI: 
              - input radio con mismo 'name' = Acordeón (uno a la vez)
              - input checkbox = Independientes (múltiples)
            */}
            <input
              type={behavior === 'single' ? 'radio' : 'checkbox'}
              name={behavior === 'single' ? name : undefined}
              defaultChecked={item.defaultOpen}
              aria-label={item.title}
            />
            
            <div className="collapse-title font-medium">
              <Text variant="body" weight="medium">
                {item.title}
              </Text>
            </div>
            
            <div className="collapse-content">
              <div className="pt-2 pb-4">
                {/* Renderizamos el contenido, puede ser texto o componentes complejos */}
                {typeof item.content === 'string' ? (
                  <Text variant="body" className="text-sm">
                    {item.content}
                  </Text>
                ) : (
                  item.content
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};