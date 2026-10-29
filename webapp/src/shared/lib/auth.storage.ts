const ACCESS_TOKEN_KEY = 'nutringest_at';
const REFRESH_TOKEN_KEY = 'nutringest_rt';

export const isTokenExpired = (token: string | null): boolean => {
    if (!token) return true;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);
        if (!payload.exp) return true;
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
};

export const authStorage = {
    getAccessToken: () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(ACCESS_TOKEN_KEY);
        }
        return null;
    },

    getRefreshToken: () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(REFRESH_TOKEN_KEY);
        }
        return null;
    },

    setTokens: (accessToken: string, refreshToken: string) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
    },

    clearTokens: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
    }
};