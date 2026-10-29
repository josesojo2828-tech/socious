'use client';

import { MenuMetadataCard } from '@/features/nutringest/menu/components/MenuMetadataCard';
import { MenuNutritionCard } from '@/features/nutringest/menu/components/MenuNutritionCard';
import { MenuIngredientsTable } from '@/features/nutringest/menu/components/MenuIngredientsTable';
import { useMenuDetail } from '@/features/nutringest/menu/hooks/useMenuDetails';
import { useParams } from 'next/navigation';
import { MenuDetailHeader } from '@/features/nutringest/menu/components/MenuDetailsHeader';
import PatientDetail from '@/features/nutringest/patient/page/PatientDetail';

export default function MenuDetail() {
    const params = useParams();
    const pageId = params.id as string; 

    // 3. Render Principal
    return (
        <PatientDetail id={pageId} />
    );
}