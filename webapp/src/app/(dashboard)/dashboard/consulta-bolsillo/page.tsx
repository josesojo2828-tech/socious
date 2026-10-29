import { Metadata } from "next";
import { ConsultaBolsilloWizard } from "@/features/nutringest/consultation/components/ConsultaBolsilloWizard";

export const metadata: Metadata = {
  title: "Consulta de Bolsillo | Nutringest",
  description: "Atención express en 3 pasos: registro inmediato, cálculos flash con Mifflin-St Jeor y entrega de pauta con copia a WhatsApp.",
};

export default function ConsultaBolsilloPage() {
  return (
    <div className="notranslate" translate="no">
      <ConsultaBolsilloWizard />
    </div>
  );
}
