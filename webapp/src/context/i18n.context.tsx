"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
const RESOURCES: Record<string, any> = {
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

type I18nContextType = {
    language: string;
    setLanguage: (lang: string) => void;
    t: (key: string, params?: Record<string, string | number>) => any;
    isLoaded: boolean;
};

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
    const [language, setLanguageState] = useState('es');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('lang');
        if (stored && RESOURCES[stored]) {
            setLanguageState(stored);
        }
        setIsLoaded(true);
    }, []);

    const setLanguage = (lang: string) => {
        if (RESOURCES[lang]) {
            setLanguageState(lang);
            localStorage.setItem('lang', lang);
            window.location.reload();
        }
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
            let translation = RESOURCES[language]?.[fileName];
            let fallbackTranslation = RESOURCES['es']?.[fileName];

            // 3. Navegamos en el objeto del idioma seleccionado
            if (translation) {
                for (const key of jsonKeys) {
                    if (translation[key] === undefined) {
                        translation = undefined;
                        break;
                    }
                    translation = translation[key];
                }
            }

            // 4. Si no se encontró en el idioma seleccionado, navegamos en español
            if (translation === undefined && fallbackTranslation) {
                translation = fallbackTranslation;
                for (const key of jsonKeys) {
                    if (translation[key] === undefined) {
                        translation = undefined;
                        break;
                    }
                    translation = translation[key];
                }
            }

            // 5. Si no se encontró en ninguno, retornamos la clave original
            if (translation === undefined) {
                console.warn(`[I18n] Clave '${path}' no encontrada en idioma '${language}' ni en 'es'`);
                return path;
            }

            if (typeof translation === 'string' && params) {
                Object.entries(params).forEach(([key, value]) => {
                    translation = (translation as string).replace(`{${key}}`, String(value));
                });
            }

            if (typeof translation !== 'string') {
                if (Array.isArray(translation)) {
                    return translation;
                }
                if (translation && typeof translation === 'object') {
                    if ('title' in translation && typeof (translation as any).title === 'string') {
                        return (translation as any).title;
                    }
                    if ('label' in translation && typeof (translation as any).label === 'string') {
                        return (translation as any).label;
                    }
                    if ('description' in translation && typeof (translation as any).description === 'string') {
                        return (translation as any).description;
                    }
                }
                return path;
            }

            return translation as string;

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