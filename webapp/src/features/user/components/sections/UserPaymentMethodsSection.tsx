'use client';

import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { UserEndpoints } from '@/features/user';
import { FichaPaymentMethod } from '../payment-method/FichaPaymentMethod';
import { CreditCard, Plus, ShieldCheck } from 'lucide-react';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { DynamicRenderForm } from '@/shared/components/organisms/DynamicForm/DynamicRenderForm';
import { CreateCustomPaymentMethod } from '../payment-method/forms/CreateCustomPaymentMethod';
import { BinanceForm } from '../payment-method/forms/BinanceForm';
import { PaypalForm } from '../payment-method/forms/PaypalForm';
import { PagoMovilForm } from '../payment-method/forms/PagoMovilForm';
import { useHandleForm } from '@/shared/hooks/useHandlerForm';

export function UserPaymentMethodsSection() {
  const { user } = useAuthStore();
  const { openModal, closeModal } = useModalStore();
  const { SendForm } = useHandleForm();

  const methods = user?.paymentMethods || [];

  const openPaymentMethodForm = (element: string, cb: () => void) => {
    const handleFormSubmit = (data: unknown) => {
      SendForm({
        path: UserEndpoints.actions.createPaymentMethod(element),
        data,
        cb: () => {
          closeModal();
          cb();
        },
      });
    };

    if (element === "Binance") {
      openModal(<BinanceForm onSubmit={handleFormSubmit} />);
    } else if (element === "PayPal") {
      openModal(<PaypalForm onSubmit={handleFormSubmit} />);
    } else if (element === "PagoMobil") {
      openModal(<PagoMovilForm onSubmit={handleFormSubmit} />);
    } else {
      openModal(
        <DynamicRenderForm
          path={UserEndpoints.form.paymentMethod(element)}
          cb={cb}
        />
      );
    }
  };

  const handleAddPaymentMethod = () => {
    const reloadCb = () => {
      closeModal();
      window.location.reload();
    };
    openModal(
      <CreateCustomPaymentMethod
        cb={reloadCb}
        setElementToForm={(element) => openPaymentMethodForm(element, reloadCb)}
      />
    );
  };

  const handleUpdate = (id: string) => {
    openModal(
      <DynamicRenderForm
        path={UserEndpoints.form.paymentMethod(id)}
        cb={() => {
          closeModal();
          window.location.reload();
        }}
      />
    );
  };

  const handleDelete = (id: string) => {
    openModal(
      <DynamicRenderForm
        path={UserEndpoints.form.paymentMethod(id)}
        cb={() => {
          closeModal();
          window.location.reload();
        }}
      />
    );
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-base-100 p-6 rounded-xl border border-base-300/70 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Métodos de Pago Registrados
            </h2>
            <p className="text-xs text-base-content/50 mt-0.5">
              Tarjetas, cuentas bancarias, Pago Móvil o PayPal configurados para tu cuenta.
            </p>
          </div>
          <button
            onClick={handleAddPaymentMethod}
            className="px-4 py-2 bg-primary hover:bg-primary/80 text-primary-content rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Agregar Método
          </button>
        </div>

        {methods.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-base-300 rounded-xl bg-base-200/50">
            <CreditCard className="w-8 h-8 text-base-content/30 mx-auto mb-2" />
            <p className="text-xs font-bold text-base-content">No posees métodos de pago registrados</p>
            <p className="text-[11px] text-base-content/50 mt-0.5">
              Agrega tu método de pago preferido para gestionar débitos automáticos o recargas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {methods.map((method) => (
              <div key={method.id} className="rounded-xl overflow-hidden border border-base-300 shadow-xs">
                <FichaPaymentMethod
                  id={method.id}
                  HandleDelete={handleDelete}
                  HandleUpdate={handleUpdate}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-base-100 p-6 rounded-xl border border-base-300/70 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-success">
          <ShieldCheck className="w-4 h-4" /> Transacciones Seguras y Cifradas
        </div>
        <p className="text-xs text-base-content/50">
          Tus datos financieros viajan cifrados bajo estándar SSL de 256 bits. Nutringest no almacena claves secretas ni códigos CVV de tarjetas en texto plano.
        </p>
      </div>
    </div>
  );
}
