"use client";

import { useReferrals } from "../../hooks/useReference";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";

export const UserReferenceSection = () => {
  const { stats, loading, error, copyReferralLink } = useReferrals();
  const { user } = useAuthStore();

  // Construimos el link aquí o en el backend, como prefieras
  const referralLink = `${window.location.origin}/register?ref=${user?.referralCode}`;

  if (loading) return <div>Cargando estadísticas...</div>;
  if (error) return <div>Error al cargar datos.</div>;

  return (
    <div className="space-y-6">

      {/* SECCIÓN COMPARTIR */}
      <div className="card bg-base-100 shadow p-6 flex-row items-center justify-between">
        <div>
          <h2 className="font-bold text-xl">Invita y Gana</h2>
          <p className="text-base-content/70">Comparte tu enlace único</p>
        </div>
        <div className="join">
          <input className="input input-bordered join-item" value={referralLink} readOnly />
          <button
            className="btn btn-primary join-item"
            onClick={() => copyReferralLink(referralLink)}
          >
            Copiar
          </button>
        </div>
      </div>

      {/* GRID DE ESTADÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat bg-base-100 shadow rounded-box">
          <div className="stat-title">Total Invitados</div>
          <div className="stat-value text-primary">{stats?.totalReferred}</div>
        </div>
        <div className="stat bg-base-100 shadow rounded-box">
          <div className="stat-title">Conversiones</div>
          <div className="stat-value text-success">{stats?.activeConversions}</div>
        </div>
        <div className="stat bg-base-100 shadow rounded-box">
          <div className="stat-title">Ganancias</div>
          <div className="stat-value text-secondary">${stats?.revenueGenerated}</div>
        </div>
      </div>

      {/* TABLA RECIENTES */}
      {/* ... iterar stats.recentReferrals ... */}
    </div>
  );
}