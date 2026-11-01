"use client";

import React, { createContext, useContext, useSyncExternalStore, useCallback } from 'react';

// Importamos estáticamente el español (default) para evitar parpadeos
import authEs from '@/i18n/es/auth.json';
import commonEs from '@/i18n/es/common.json';
import dashboardEs from '@/i18n/es/dashboard.json';
import errorEs from '@/i18n/es/error.json';
import formEs from '@/i18n/es/form.json';
import landingEs from '@/i18n/es/landing.json';
import exchangeEs from '@/i18n/es/exchange.json';
import menuEs from '@/i18n/es/menu.json';
import clinicalEs from '@/i18n/es/clinical.json';

// Importamos estáticamente el inglés (not_en)
import authEn from '@/i18n/not_en/auth.json';
import commonEn from '@/i18n/not_en/common.json';
import dashboardEn from '@/i18n/not_en/dashboard.json';
import errorEn from '@/i18n/not_en/error.json';
import formEn from '@/i18n/not_en/form.json';
import landingEn from '@/i18n/not_en/landing.json';
import clinicalEn from '@/i18n/not_en/clinical.json';

// Mapa de recursos (simulando tu estructura de backend)
const RESOURCES: Record<string, Record<string, unknown>> = {
    es: {
        common: commonEs,
        auth: authEs,
        dashboard: dashboardEs,
        error: errorEs,
        form: formEs,
        landing: landingEs,
        exchange: exchangeEs,
        menu: menuEs,
        clinical: clinicalEs,
    },
    not_en: {
        common: commonEn,
        auth: authEn,
        dashboard: dashboardEn,
        error: errorEn,
        form: formEn,
        landing: landingEn,
        exchange: exchangeEs, // Fallback a español si no existe archivo de intercambio en inglés
        menu: menuEs,         // Fallback a español si no existe archivo de menú en inglés
        clinical: clinicalEn,
    },
};

// Mapeamos 'en' a 'not_en' por conveniencia
RESOURCES['en'] = RESOURCES['not_en'];

/** Lee el idioma persistido; en el servidor siempre 'es' (evita mismatch de hidratación). */
const getStoredLanguage = (): string => {
    const stored = localStorage.getItem('lang');
    return stored && RESOURCES[stored] ? stored : 'es';
};

/** Sin eventos externos: setLanguage persiste y recarga la página. */
const subscribeToLanguage = () => () => { };

type I18nContextType = {
    language: string;
    setLanguage: (lang: string) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    isLoaded: boolean;
};

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
    // Los JSON se importan estáticamente, así que las traducciones siempre están listas.
    const language = useSyncExternalStore(subscribeToLanguage, getStoredLanguage, () => 'es');
    const isLoaded = true;

    const setLanguage = (lang: string) => {
        if (RESOURCES[lang]) {
            localStorage.setItem('lang', lang);
            window.location.reload();
        }
    };

    /** Desciende por un árbol de traducción replicando el loop original:
     *  raíz falsy se devuelve tal cual; rama ausente → undefined; null a mitad
     *  de camino lanza (el catch externo de `t` devuelve la clave cruda). */
    const descend = (root: unknown, keys: string[]): unknown => {
        let node: unknown = root;
        if (!node) return node;
        for (const key of keys) {
            if (node === null || node === undefined) {
                throw new TypeError(`Cannot read properties of ${String(node)}`);
            }
            const value = (node as Record<string, unknown>)[key];
            if (value === undefined) return undefined;
            node = value;
        }
        return node;
    };

    // La función mágica que imita a tu backend: 'sidebar.menu.dashboard' con fallback robusto a español
    const t = useCallback((path: string, params?: Record<string, string | number>) => {
        try {
            if (!path || !path.includes('.')) {
                return path;
            }
            // 1. Separamos 'archivo.clave.subclave' -> ['archivo', 'clave', 'subclave']
            const parts = path.split('.');
            const fileName = parts[0]; // filename 
            const jsonKeys = parts.slice(1); // key

            // 2. Buscamos en el idioma actual y en español (fallback)
            let translation: unknown = descend(RESOURCES[language]?.[fileName], jsonKeys);

            // 4. Si no se encontró en el idioma seleccionado, navegamos en español
            if (translation === undefined) {
                translation = descend(RESOURCES['es']?.[fileName], jsonKeys);
            }

            // 5. Si no se encontró en ninguno, retornamos la clave original
            if (translation === undefined) {
                console.warn(`[I18n] Clave '${path}' no encontrada en idioma '${language}' ni en 'es'`);
                return path;
            }

            if (typeof translation === 'string' && params) {
                let resolved: string = translation;
                Object.entries(params).forEach(([key, value]) => {
                    resolved = resolved.replace(`{${key}}`, String(value));
                });
                translation = resolved;
            }

            if (typeof translation !== 'string') {
                if (Array.isArray(translation)) {
                    // El contrato público es string; en runtime se devuelve el
                    // array tal cual (React lo renderiza) para no cambiar el
                    // comportamiento previo.
                    return translation as unknown as string;
                }
                if (translation && typeof translation === 'object') {
                    const record = translation as Record<string, unknown>;
                    if (typeof record.title === 'string') {
                        return record.title;
                    }
                    if (typeof record.label === 'string') {
                        return record.label;
                    }
                    if (typeof record.description === 'string') {
                        return record.description;
                    }
                }
                return path;
            }

            return translation;

        } catch (error) {
            return path;
        }
    }, [language]);

    return (
        <I18nContext.Provider value={{ language, setLanguage, t, isLoaded }}>
            {children}
        </I18nContext.Provider>
    );
};

// Hook personalizado para usarlo fácil
export const useTranslation = () => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useTranslation debe usarse dentro de un I18nProvider');
    }
    return context;
};