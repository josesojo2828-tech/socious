import { HorizontalCardProps } from './HorizontalCard.types';

export const HorizontalCard = ({ children, className = '' }: HorizontalCardProps) => {
  return (
    <div className={className}>
      {/* organism implementation: HorizontalCard */}
      {children || 'HorizontalCard Component'}
    </div>
  );
};
