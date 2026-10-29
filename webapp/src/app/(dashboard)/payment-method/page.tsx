'use client';

import { PaymentMethodStats } from '@/features/payment-method/components/PaymentMethodStats';
import { CreatePaymentMethodSection } from '@/features/payment-method/components/CreatePaymentMethodSection';

export default function PaymentMethodPage() {
  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header>
          <h1 className="text-3xl font-bold text-primary capitalize">payment-method</h1>
          <p className="text-base-content/70">Gestión del módulo de payment-method.</p>
        </header>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PaymentMethodStats />
          {/* Puedes añadir más widgets aquí, como una tabla de resumen */}
        </div>

        {/* Form Section */}
        <CreatePaymentMethodSection />

      </div>
    </div>
  );
}
