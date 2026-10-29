# Project Architecture & Directory Structure

Monorepo with three applications (NestJS API, Next.js web app, Flutter mobile
app) plus Docker-based infrastructure. Each application is self-contained in
its own top-level directory.

```
Nutringest_Arch/
├── serverapp/          # NestJS API (Fastify + Prisma + PostgreSQL)
├── webapp/             # Next.js web application
├── nutringest_mobile/  # Flutter mobile application
├── docker/             # Nginx configs and local service data
├── docs/               # Product and architecture decision notes
├── scripts/            # Repository-level helper scripts
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── Makefile            # Primary workflow entry point
```

## Backend (`serverapp/`, NestJS)

**Modular & Domain-Driven.** Each domain is a self-contained module under
`src/modules`. Modules own their controller, service, repository, DTOs, Prisma
model wrapper and guards.

```
serverapp/src/
├── app.module.ts       # Root module importing all feature modules
├── main.ts             # Entry point (Fastify adapter)
├── modules/            # Feature modules — the core logic
│   └── [feature]/
│       ├── [feature].module.ts
│       ├── [feature].controller.ts
│       ├── dto/        # Data Transfer Objects (class-validator)
│       ├── model/      # Domain model (permissions, forms, columns)
│       ├── repository/ # Prisma data access
│       ├── service/    # Business logic
│       ├── guards/     # Feature-specific guards
│       └── util/       # Feature-specific helpers
├── shared/             # Cross-cutting infrastructure
│   ├── decorators/     # Custom decorators
│   ├── error/          # Exception filters and error shapes
│   ├── event/          # Domain event definitions and listeners
│   ├── interceptors/   # Response interceptors
│   ├── logger/         # Pino-backed logger service
│   ├── services/       # Shared services (workspace context, etc.)
│   ├── seed/ and fixtures/ # Database seeding and test fixtures
│   └── types/          # Shared TypeScript definitions
├── database/seeds/     # Versioned seed scripts (modules, clinic demo, etc.)
└── i18n/               # nestjs-i18n translation catalogs
```

The Prisma schema and migrations live at `serverapp/prisma/`
(`schema.prisma`, `migrations/`); `src/database/seeds` only holds seed scripts.

Modules present today: `activity`, `auth`, `billing`, `campus`, `cms`,
`core`, `country`, `custom-personal`, `dashboard`, `exchange`, `file`, `mail`,
`marketplace`, `module-framework`, `notification`, `nutringest`,
`organization`, `payment-method`, `permit`, `portfolio`, `priority-leads`,
`subscription`, `system-setting`, `transaction`, `usage`, `user`, `wallet`.

**Key stack:** NestJS 11, Fastify, Prisma 6 (PostgreSQL), JWT auth via Passport,
`nestjs-i18n`, `nestjs-pino`, Redis (`ioredis`) for caching, Swagger.

### Authorization flow

Authentication and entitlements are resolved once per request and attached to
`request.user`, so guards and handlers never re-derive them.

```
SessionAuthGuard            # validates JWT, loads user, attaches user.entitlements
  └─ EntitlementService     # resolve(userId, workspaceId), cached 60s
       └─ resolveEntitlements  # pure union: role permits + plan + grants + add-ons
  └─ SubscriptionActiveGuard   # rejects users without an active subscription
EntitlementGuard (global)   # opt-in per route via @RequireEntitlement
```

- `SessionAuthGuard` is registered globally (`APP_GUARD` in `AuthModule`).
- `EntitlementGuard` is a **no-op unless `ENTITLEMENTS_ENABLED=true`**; routes
  decorated with `@RequireEntitlement` are only enforced when that flag is on.
- Role definitions live in `modules/permit/model/permit.model.ts`.
- Workspace context is carried by the `x-workspace-id` header and resolved by
  `shared/services/workspace-context.service.ts`.
- See `docs/authz-product-decisions.md` for open product decisions.

## Frontend (`webapp/`, Next.js)

**Feature-based** architecture on the Next.js App Router. `app/` is the routing
layer only; domain logic and UI live in `features/`, and reusable pieces live in
`shared/`.

```
webapp/src/
├── app/                # App Router (routing layer only)
│   ├── (dashboard)/    # Authenticated dashboard route group
│   ├── nutri/[user]/   # Public nutritionist profile pages
│   ├── patient/        # Patient portal
│   ├── login/, register/, reset-password/
│   ├── blog/, campus/, calculadora/, marketing/  # Public pages
│   ├── api/            # Route handlers
│   └── layout.tsx      # Root layout
├── features/           # Feature modules
│   ├── calculadora/
│   ├── community/
│   ├── core/
│   ├── dashboard/
│   ├── marketplace/
│   ├── modules/
│   ├── nutringest/
│   ├── payment-method/
│   ├── portfolio/
│   ├── public/
│   ├── subscription/
│   └── user/
│       ├── components/ # Components only used in this feature
│       ├── hooks/      # Feature-specific hooks
│       ├── schemas/    # Zod validation schemas
│       ├── services/   # API calls
│       └── types/
├── shared/             # Cross-cutting code
│   ├── api/            # Base API client (Axios)
│   ├── authz/          # Client-side permission/entitlement helpers
│   ├── components/     # Reusable UI
│   ├── hooks/          # Global hooks
│   ├── lib/            # Library configuration (cn, formatting, etc.)
│   ├── providers/      # React context providers
│   ├── service/        # Global services
│   └── store/          # Zustand stores (auth, entitlement, workspace, ui)
├── components/         # Design-system primitives
│   ├── ui/             # Base components (atomic building blocks)
│   └── reactbits/      # Animated/visual effect components
├── i18n/               # Translation catalogs (es / en)
├── lib/                # Framework-agnostic utilities
├── context/            # React contexts (i18n)
├── proxy.ts            # Next.js request proxy (@username -> /nutri/username)
└── types/              # Global TypeScript definitions
```

**Key stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4,
Zustand for global state, TanStack Query for server state, React Hook Form +
Zod for forms, Axios for HTTP.

**Access control:** `(dashboard)/layout.tsx` performs client-side session and
subscription checks so unauthenticated users are redirected to `/login`. That
is a UX guard, **not** the security boundary — every rule is enforced again on
the server by `SessionAuthGuard` and the entitlement guards. Client helpers in
`shared/authz` and `shared/store/entitlement` only drive UI affordances.

## Mobile (`nutringest_mobile/`, Flutter)

Feature-based architecture. Shared infrastructure lives in `core`; each domain
lives under `features` with its own widgets, models and services.

```
nutringest_mobile/lib/
├── main.dart           # Entry point
├── core/               # Shared infrastructure
│   ├── navigation/     # Router and route definitions
│   ├── network/        # HTTP client (Dio) and interceptors
│   ├── storage/        # Secure/persistent storage
│   ├── theme/          # Design tokens and theming
│   └── widgets/        # Reusable UI primitives
└── features/           # Feature modules
    ├── agenda/
    ├── auth/
    ├── calculators/
    ├── clinical/
    ├── community/
    ├── dashboard/
    ├── gestion/
    ├── nutrition/
    └── patients/
```

**Key stack:** Flutter (Dart SDK ^3.11), Provider for state, Dio for HTTP,
`flutter_secure_storage` for tokens, `google_fonts` for typography.

## Infrastructure (`docker/`)

`docker-compose.dev.yml` and `docker-compose.prod.yml` define the runtime
topology:

| Service       | Dev | Prod | Purpose                                   |
| ------------- | --- | ---- | ----------------------------------------- |
| `database`    | ✓   | ✓    | PostgreSQL                                |
| `cache`       | ✓   | ✓    | Redis                                     |
| `minio`       | ✓   | ✓    | S3-compatible object storage              |
| `minio-setup` | ✓   | ✓    | One-shot bucket/credentials initializer   |
| `pgadmin`     | ✓   | —    | Database browser                          |
| `backend`     | ✓   | ✓    | NestJS API                                |
| `frontend`    | ✓   | ✓    | Next.js application                       |
| `nginx`       | ✓   | ✓    | Reverse proxy (`docker/*.conf`)           |

`docker-compose.yml` at the root is a minimal database + backend stack used for
local API work without the full compose file.

Nginx configs: `docker/nginx.dev.conf` and `docker/nginx.prod.conf`.
Service data (Postgres, Redis, MinIO, uploads) is bind-mounted under
`docker/data/` and is not tracked by git.

## Workflow

The `Makefile` is the primary entry point:

```bash
make install   # npm install for serverapp and webapp
make qa        # docker compose -f docker-compose.dev.yml up --build
make dev       # clean build output and restart dev stack detached
make up        # docker compose -f docker-compose.prod.yml up -d --build
make down      # stop both dev and prod stacks
make build     # build prod images
make logs      # follow prod logs
```

CI runs a webapp typecheck on pushes to `develop`/`main` and on pull requests
(`.github/workflows/typecheck.yml`).
