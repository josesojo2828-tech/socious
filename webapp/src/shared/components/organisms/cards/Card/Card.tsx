import { CardProps } from './Card.types';

export const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div className={className}>
      {/* organism implementation: Card */}
      {children || 'Card Component'}
    </div>
  );
};
