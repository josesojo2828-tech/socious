"use client"

import { useState } from 'react';
import {
  Bell,
  Smartphone,
  Shield,
  Globe,
  ChevronRight,
  LogOut,
  Palette,
  Plus
} from 'lucide-react';
import { Text } from '@/shared/components/atoms/Text';
import { useTranslation } from '@/context/i18n.context';
import { Avatar } from '@/shared/components/atoms/Avatar';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { Button } from '@/shared/components/atoms/Button';
import { Input } from '@/shared/components/atoms/Input';
import { useModalStore } from '@/shared/store/ui/useModalStore';

export const UserPreferenceSection = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { isOpen, openModal } = useModalStore();

  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div className="min-h-screen font-sans" id="custom-theme-wrapper">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="space-y-6">

          {/* SECCIÓN: PERFIL */}
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar
                  className='w-16 h-16 flex items-center rounded justify-center overflow-hidden'
                  src={user?.avatarUrl}
                  prefix
                  shape='square'
                />
              </div>
              <div className="flex-1">
                <Text as={'h2'} variant='h2' className="text-xl font-semibold">{user?.firstName} {user?.lastName}</Text>
                <Text as={'p'} variant='muted' className="opacity-60 text-sm">{user?.email}</Text>
                <Text as={'p'} variant='muted' className="opacity-60 text-sm">{user?.username}</Text>
              </div>
            </div>
          </div>

          {/* SECCIÓN: NOTIFICACIONES */}
          <div className="bg-base-100 overflow-hidden shadow-sm" style={{ borderRadius: 'var(--radius-box)' }}>
            <div className="p-4 border-b border-base-300/50 flex items-center gap-2">
              <Bell size={18} className="text-primary" />
              <h3 className="font-semibold">{t('common.actions.notification')}</h3>
            </div>

            <div className="divide-y divide-base-300/50">
              <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-base-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-success/10 text-success">
                    <Globe size={16} />
                  </div>
                  <div>
                    <Text as={'p'} variant='muted' className="font-medium text-sm">{t('common.user.noti_email_mak')}</Text>
                    <Text as={'p'} variant='muted' className="text-xs opacity-60">{t('common.user.noti_email_promotion')}</Text>
                  </div>
                </div>
                <input checked={emailNotif} onChange={() => setEmailNotif(!emailNotif)} type='checkbox' className='checkbox checkbox-primary' />
              </label>

              <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-base-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <Text as={'p'} variant='muted' className="font-medium text-sm">{t('common.user.noti_push')}</Text>
                    <Text as={'p'} variant='muted' className="text-xs opacity-60">{t('common.user.noti_realtime')}</Text>
                  </div>
                </div>
                <input checked={pushNotif} onChange={() => setPushNotif(!pushNotif)} type='checkbox' className='toggle toggle-custom' />
              </label>
            </div>
          </div>

          {/* BOTÓN CERRAR SESIÓN */}
          <div className="flex justify-center pt-4">
            <Button className='flex items-center not-first:gap-2 text-sm font-medium' variant='error'>
              <LogOut size={16} /> Cerrar Sesión
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
