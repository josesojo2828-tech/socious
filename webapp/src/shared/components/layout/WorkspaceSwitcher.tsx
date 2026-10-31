import React, { useEffect, useState } from 'react';
import { useWorkspaceStore, WorkspaceItem } from '@/shared/store/workspace/useWorkspaceStore';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';

export const WorkspaceSwitcher: React.FC = () => {
  const { user } = useAuthStore();
  const { activeWorkspace, workspaces, setActiveWorkspace, fetchWorkspaces, isLoading } =
    useWorkspaceStore();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchWorkspaces(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (workspaces.length <= 1) {
    return null;
  }

  const handleSelect = (workspace: WorkspaceItem) => {
    setActiveWorkspace(workspace);
    setIsOpen(false);
    
    if (workspace.requiresSubscription) {
      window.location.href = 'https://sub.nutringest.com';
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="relative inline-block text-left z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Cambiar espacio de trabajo"
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-indigo-300/40 bg-indigo-900/10 hover:bg-indigo-900/15 text-indigo-950 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white backdrop-blur-md shadow-xs transition-all text-xs font-semibold group"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shadow-sm animate-pulse shrink-0"
          style={{ backgroundColor: activeWorkspace.userColorHex || '#4F46E5' }}
        />
        
        <span className="flex items-center gap-1.5">
          {activeWorkspace.type === 'ORGANIZATION' ? (
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-200 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-1-4h.01M9 16h.01M9 12h.01M9 8h.01M15 16h.01M15 12h.01M15 8h.01" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-200 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
          <span className="hidden md:inline-block max-w-[130px] truncate text-indigo-950 dark:text-slate-100 font-bold dark:font-semibold">{activeWorkspace.name}</span>
        </span>

        <div className="hidden md:inline-block">
          {activeWorkspace.role ? (
            <span className="px-1.5 py-0.5 text-[10px] uppercase font-extrabold tracking-wider rounded bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 border border-indigo-500/30 dark:border-indigo-400/30">
              {activeWorkspace.role.replace('CLINIC_', '')}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 text-[10px] uppercase font-extrabold tracking-wider rounded bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-500/30 dark:border-emerald-400/30">
              Personal
            </span>
          )}
        </div>

        <svg className={`w-3.5 h-3.5 text-indigo-700 dark:text-indigo-200 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl z-50 p-2 text-xs divide-y divide-slate-100 dark:divide-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
              <span>Espacios de Trabajo</span>
              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500 font-bold">
                {workspaces.length}
              </span>
            </div>

            <div className="py-1.5 space-y-1">
              {workspaces.map((ws) => {
                const isSelected = ws.id === activeWorkspace.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => handleSelect(ws)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-50 to-indigo-50 dark:from-indigo-950/60 dark:to-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-100 dark:border-indigo-900/40 shadow-sm'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: ws.userColorHex || '#4F46E5' }}
                      />
                      <div className="flex flex-col text-left truncate">
                        <span className="truncate text-xs font-semibold">{ws.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {ws.type === 'ORGANIZATION' ? 'Organización / Clínica' : 'Espacio Personal'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {ws.subscriptionStatus && ws.type === 'ORGANIZATION' && (
                        <span className={`px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded ${
                          ws.subscriptionStatus === 'ACTIVE' || ws.subscriptionStatus === 'TRIAL'
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                            : ws.subscriptionStatus === 'GRACE_PERIOD'
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                            : 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                        }`}>
                          {ws.subscriptionStatus === 'ACTIVE' && 'Activo'}
                          {ws.subscriptionStatus === 'TRIAL' && 'Prueba'}
                          {ws.subscriptionStatus === 'GRACE_PERIOD' && 'Gracia'}
                          {ws.subscriptionStatus === 'NONE' && 'Sin Plan'}
                        </span>
                      )}

                      {ws.requiresSubscription && (
                        <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}

                      {isSelected && (
                        <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
