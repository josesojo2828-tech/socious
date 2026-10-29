import { PrivateFooterProps } from './PrivateFooter.types';

export const PrivateFooter = ({ children, className = '' }: PrivateFooterProps) => {
  return (
    <div className={className}>
      {/* organism implementation: PrivateFooter */}
      {children || 'PrivateFooter Component'}
    </div>
  );
};
