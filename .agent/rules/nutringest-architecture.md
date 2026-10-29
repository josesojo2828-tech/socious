---
description: Nutringest Architecture, API routing, JWT auth, theme persistence, SEO and deployment conventions
trigger: always_on
---

# Nutringest Architecture & Deployment Guidelines

## 1. API Route Prefixes (`serverapp` & `webapp`)
- **Backend Controllers**: All NestJS controllers in `serverapp` use the `@Controller("api/...")` route prefix decorator (e.g. `@Controller("api/user")`).
- **Frontend API Client**: Always include the `/api/` prefix in `apiClient` requests (e.g., `apiClient.post('/api/user/subscription/renew-now')`). Never omit `/api/` to avoid 404 AxiosErrors.

## 2. JWT Authentication & Silent Refresh Interceptor
- **Token Expirations**: Access tokens are configured to `7d` and Refresh Tokens to `30d` in `AuthService`.
- **Silent Refresh Interceptor**: `webapp/src/shared/api/api.client.ts` intercepts `401 Unauthorized` responses and automatically attempts silent token renewal via `/api/auth/refresh`.
- **Toast Guardrails**: NEVER trigger `toast.error("Tu sesión ha expirado")` during initial page loads, background rehydrations, or public routes (`/`, `/calculadora`, `/marketing/*`). Session expiration toasts are strictly reserved for explicit user actions in protected `/dashboard/*` routes when token refresh fails.

## 3. Global Persistent Theme (Light / Dark)
- **Theme Provider**: Consume `useTheme()` from `next-themes` across all public and private pages (`/`, `/login`, `/register`, `/calculadora`, `/dashboard`).
- **DOM & Icon Sync**: Bind `data-theme={resolvedTheme || 'light'}` on the root wrapper container and dynamically render Phosphor icons (`ph-sun` for dark mode, `ph-moon` for light mode). Avoid isolated component-level `useState("light")` hooks that fail to persist on page refresh.

## 4. Technical B2B SEO Standards
- **Dynamic Routes**: Use `sitemap.ts` and `robots.txt` in `webapp/src/app/`.
- **Metadata API**: Define explicit canonical URLs (`https://nutringest.com`), OpenGraph properties, and JSON-LD structured data (`SoftwareApplication` / `MedicalBusiness`) targeting high-intent keywords:
  - *"Software para nutricionistas"*
  - *"Herramienta para nutricionistas y clínicas"*
  - *"Software para clínicas de nutrición"*

## 5. Production VPS Deployment & Branch Strategy
- **Production Branch**: The VPS production server tracks `main`.
- **Backend VPS Update Commands**:
  ```bash
  cd ~/www/nutringest-arch
  git pull origin main
  docker compose up -d --build backend
  ```
- **Frontend Deployment**: Automatically compiled and deployed by Vercel upon pushing to `origin/main`.
