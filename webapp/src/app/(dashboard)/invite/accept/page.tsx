"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { organizationService } from '@/features/nutringest/clinic/services/organization.service';
import { Building2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [clinicName, setClinicName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    const accept = async () => {
      const result = await organizationService.acceptInvitation(token);
      if (result.success) {
        setClinicName(result.organization?.name || 'la clínica');
        setStatus('success');
        // Refresh workspaces after accepting
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setErrorMessage('No se pudo procesar la invitación. El enlace puede haber expirado.');
        setStatus('error');
      }
    };

    accept();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        {status === 'loading' && (
          <>
            <RefreshCw className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Procesando invitación...</h1>
            <p className="text-sm text-slate-500">Un momento mientras confirmamos tu lugar en la clínica.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">¡Bienvenido a {clinicName}!</h1>
            <p className="text-sm text-slate-500 mb-6">
              Ya eres parte del equipo. Serás redirigido al dashboard en unos segundos.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all"
            >
              <Building2 className="w-4 h-4" />
              Ir al Dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Invitación no válida</h1>
            <p className="text-sm text-slate-500 mb-6">{errorMessage}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
            >
              Ir al Dashboard
            </Link>
          </>
        )}

        {status === 'no-token' && (
          <>
            <XCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Enlace inválido</h1>
            <p className="text-sm text-slate-500 mb-6">No se encontró un token de invitación en la URL.</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
            >
              Ir al Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
