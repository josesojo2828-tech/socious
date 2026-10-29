"use client";

import { GenerateCrud } from "@/shared/components/organisms/crud";
import { UserEndpoints } from "../../services/user.endpoints";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { FichaPaymentMethod } from "../payment-method/FichaPaymentMethod";
import { CreateCustomPaymentMethod } from "../payment-method/forms/CreateCustomPaymentMethod";
import { BinanceForm } from "../payment-method/forms/BinanceForm";
import { PaypalForm } from "../payment-method/forms/PaypalForm";
import { PagoMovilForm } from "../payment-method/forms/PagoMovilForm";
import { useHandleForm } from "@/shared/hooks/useHandlerForm";

export default function PaymentMethodPage() {
  const { openModal,closeModal } = useModalStore();
  const { SendForm } = useHandleForm();
  const HandleFicha = (id: string, HandleDelete: (id: string) => void, HandleUpdate: (id: string) => void) => {
    openModal(<FichaPaymentMethod id={id} HandleDelete={HandleDelete} HandleUpdate={HandleUpdate} />)
  }

  const HandleSpecifyCreate = async (data: any, cb: () => void) => {
    openModal(<CreateCustomPaymentMethod cb={cb} setElementToForm={(element) => OpenForm(element, cb)} />)
  }

  const OpenForm = (element: any, cb: () => void) => {
    if (element === "Binance") openModal(<BinanceForm onSubmit={(data) => SendForm({ path: UserEndpoints.actions.createPaymentMethod(element), data, cb: () => { closeModal(); cb(); } })} />);
    else if (element === "PayPal") openModal(<PaypalForm onSubmit={(data) => SendForm({ path: UserEndpoints.actions.createPaymentMethod(element), data, cb: () => { closeModal(); cb(); } })} />);
    else if (element === "PagoMobil") openModal(<PagoMovilForm onSubmit={(data) => SendForm({ path: UserEndpoints.actions.createPaymentMethod(element), data, cb: () => { closeModal(); cb(); } })} />);
  }

  return (
    <GenerateCrud
      path={{
        list: UserEndpoints.actions.paymentMethods(),
        create: UserEndpoints.form.paymentMethod(),
        view: UserEndpoints.actions.paymentMethodUnique,
        update: UserEndpoints.form.paymentMethod,
        delete: UserEndpoints.actions.paymentMethodRemove,
      }}
      fichaComponent={HandleFicha}
      object="payment-method"
      handlers={{
        create: HandleSpecifyCreate
      }}
    />
  )
}