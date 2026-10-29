import { FooterProps } from './Footer.types';

export const Footer = ({ children, className = '' }: FooterProps) => {
  return (
    <div className={className}>
      {/* organism implementation: Footer */}
      {children || 'Footer Component'}
    </div>
  );
};
