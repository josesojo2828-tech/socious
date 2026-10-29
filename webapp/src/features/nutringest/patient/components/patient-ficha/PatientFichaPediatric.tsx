'use client';

import React from 'react';
import { PatientDetail } from '@/types/nutringest/patient.interface';
import PediatricHistoryForm from '../PediatricHistoryForm';

interface Props {
  patient: PatientDetail;
}

export const PatientFichaPediatric: React.FC<Props> = ({ patient }) => {
  return (
    <PediatricHistoryForm
      patientId={patient.id}
      patient={patient}
      isEmbedded={true}
      showBackButton={false}
    />
  );
};
