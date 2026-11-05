'use client';

import {
  Activity,
  Calendar,
  CreditCard,
  Info,
  LogIn,
  Receipt,
  Users,
  Wallet,
} from 'lucide-react';
import { Field, SectionCard, StatusPill } from './SectionCard';
import type {
  UserDetailStats,
  UserDetailSubscription,
  UserDetailUser,
  UserDetailWallet,
} from '@/types/backend/user-detail.type';

interface GeneralTabProps {
  user: UserDetailUser;
  wallet: UserDetailWallet | null;
  subscription: UserDetailSubscription | null;
  stats: UserDetailStats;
}

function StatCard({
  icon: IconComponent,
  iconClassName,
  value,
  label,
  valueClassName,
}: {
  icon: typeof Wallet;
  iconClassName: string;
  value: string;
  label: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-xs flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${iconClassName}`}>
        <IconComponent size={22} />
      </div>
      <div className="min-w-0">
        <p className={`font-black text-base-content truncate ${valueClassName ?? 'text-xl'}`}>
          {value}
        </p>
        <p className="text-xs text-base-content/50 font-medium">{label}</p>
      </div>
    </div>
  );
}

export function GeneralTab({ user, wallet, subscription, stats }: GeneralTabProps) {
  const name =
    user.fullName ||
    `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
    user.email;
  const displayBalance = wallet ? `$${Number(wallet.balance).toFixed(2)}` : 'Sin billetera';
  const subscriptionPlanName = subscription
    ? `${subscription.plan.name} — $${Number(subscription.plan.price).toFixed(2)}`
    : 'Sin suscripción';

  return (
    <div className="space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Wallet}
          iconClassName="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
          value={displayBalance}
          label="Billetera"
        />
        <StatCard
          icon={CreditCard}
          iconClassName="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
          value={subscriptionPlanName}
          label="Suscripción"
          valueClassName="text-sm font-bold"
        />
        <StatCard
          icon={LogIn}
          iconClassName="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
          value={String(stats.totalLogins)}
          label="Inicios de sesión"
        />
        <StatCard
          icon={Users}
          iconClassName="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
          value={String(stats.totalReferrals)}
          label="Referidos"
        />
        <StatCard
          icon={Receipt}
          iconClassName="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
          value={String(stats.totalTransactions)}
          label="Transacciones"
        />
        <StatCard
          icon={Activity}
          iconClassName="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300"
          value={String(stats.totalActivityLogs)}
          label="Registros de actividad"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <SectionCard title="Información Personal" icon={Info}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Nombre completo">{name}</Field>
            <Field label="Email">
              <span className="break-all">{user.email}</span>
            </Field>
            <Field label="Username">
              <span className="font-mono">{user.username ? `@${user.username}` : '—'}</span>
            </Field>
            <Field label="Fecha de registro">
              {new Date(user.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Field>
          </div>

          {user.referralCode && (
            <div className="pt-3 mt-4 border-t border-base-300">
              <Field label="Código de referido">
                <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {user.referralCode}
                </span>
              </Field>
            </div>
          )}

          {user.referredBy && (
            <div className="pt-3 mt-4 border-t border-base-300">
              <Field label="Referido por">
                <p>{user.referredBy.fullName}</p>
                <p className="text-xs text-base-content/70">{user.referredBy.email}</p>
              </Field>
            </div>
          )}
        </SectionCard>

        {/* Account overview */}
        <SectionCard title="Resumen de la cuenta" icon={Calendar}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Estado">
              <StatusPill status={user.status} />
            </Field>
            <Field label="Rol / Permiso">
              <span className="badge badge-sm border-none px-2.5 py-1 font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                {user.permitName}
              </span>
            </Field>
            <Field label="Permiso" className="sm:col-span-2">
              <p className="text-sm text-base-content/80">
                {user.permitDescription || 'Sin descripción'}
              </p>
            </Field>
            <Field label="Último inicio de sesión">
              {stats.lastLogin
                ? new Date(stats.lastLogin).toLocaleString('es-ES')
                : 'Nunca'}
            </Field>
            <Field label="Última IP">
              <span className="font-mono">{stats.lastLoginIp || 'N/A'}</span>
            </Field>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
