import { PDFDownloadLink } from '@react-pdf/renderer';
import { PlanDocument } from '../pdf/Document';

interface Props {
    planData: any;
}

// En tu componente de UI:
export const PlanActions = ({ planData }: Props) => {
  return (
    <div className="flex gap-4">
      {/* Botón para generar y descargar PDF al instante */}
      <PDFDownloadLink 
        document={<PlanDocument plan={planData} />} 
        fileName={`Plan_${planData.patient.firstName}.pdf`}
        className="btn-primary flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
      >
        {({ loading }) => (loading ? 'Generando PDF...' : '📄 Descargar PDF')}
      </PDFDownloadLink>

      {/* Botón para copiar Link Compartido */}
      <button 
        onClick={() => {
            const url = `${window.location.origin}/shared/${planData.shareToken}`;
            navigator.clipboard.writeText(url);
            alert('Link copiado!');
        }}
        className="btn-secondary border border-base-300 px-4 py-2 rounded-lg"
      >
        🔗 Copiar Link para Paciente
      </button>
    </div>
  );
};