'use client';

import ClinicalHistoryForm from '@/features/nutringest/patient/components/ClinicalHistoryForm';
import { useParams } from 'next/navigation';

export default function ClinicalHistoryPage() {
    const params = useParams();
    const patientId = params.id as string;

    return <ClinicalHistoryForm patientId={patientId} />;
}
