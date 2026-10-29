import type { IActivityLog } from '@/types/backend/activity.type';

export type I18nFn = (path: string, params?: Record<string, string | number>) => any;

/**
 * Taxonomy categories emitted by the backend (`EventCategory` in
 * `serverapp/src/shared/event/event-taxonomy.ts`). Kept in sync manually because
 * the webapp cannot import server code.
 */
export type ActivityCategory =
  | 'auth.session'
  | 'clinical'
  | 'library.tools'
  | 'billing'
  | 'admin'
  | 'org.tenant';

/** Semantic icon token the UI can map to an actual icon component. */
export type ActivityIcon = 'auth' | 'clinical' | 'library' | 'billing' | 'admin' | 'org';

export interface ActivityActionConfig {
  label: string;
  badgeClass: string;
  /** Taxonomy category when the action is a namespaced event. */
  category?: ActivityCategory;
  /** Semantic icon token for the category (UI maps it to an icon). */
  icon?: ActivityIcon;
  /** True for legacy `Entity_VERB` / `legacy.*` actions. */
  legacy?: boolean;
  /** True when the action could not be recognized at all. */
  unknown?: boolean;
}

const VERB_BADGES: Record<string, string> = {
  create: 'badge-success',
  update: 'badge-warning',
  delete: 'badge-error',
  login: 'badge-primary',
  logout: 'badge-primary',
};

/** Per-category badge + icon (design: readable labels/icons per category). */
const CATEGORY_META: Record<ActivityCategory, { badgeClass: string; icon: ActivityIcon }> = {
  'auth.session': { badgeClass: 'badge-primary', icon: 'auth' },
  clinical: { badgeClass: 'badge-success', icon: 'clinical' },
  'library.tools': { badgeClass: 'badge-info', icon: 'library' },
  billing: { badgeClass: 'badge-warning', icon: 'billing' },
  admin: { badgeClass: 'badge-neutral', icon: 'admin' },
  'org.tenant': { badgeClass: 'badge-accent', icon: 'org' },
};

/**
 * Longest prefixes first so multi-segment categories (`org.tenant`,
 * `auth.session`, `library.tools`) win over their first segment.
 */
const CATEGORY_PREFIXES: ActivityCategory[] = [
  'org.tenant',
  'auth.session',
  'library.tools',
  'clinical',
  'billing',
  'admin',
];

const LEGACY_FALLBACK_PREFIX = 'legacy.';

/** Legacy composite action format: `${entity}_${VERB}` (e.g. `PATIENT_ARCHIVED`). */
const LEGACY_ENTITY_VERB = /^(.+?)_([A-Za-z]+)$/;

/**
 * The legacy mapper looked up `actions.create|update|delete`, but the i18n
 * catalog stores the past tense (`created|updated|deleted`). Normalize so old
 * rows keep rendering the same labels.
 */
const VERB_ALIASES: Record<string, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
};

const normalizeVerb = (verb: string): string => VERB_ALIASES[verb.toLowerCase()] ?? verb;

const camelToSnake = (value: string): string =>
  value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

const words = (value: string): string[] =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[._\-\s]+/)
    .filter(Boolean);

const humanizeEntity = (value: string): string =>
  words(value)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const humanizeVerb = (value: string): string =>
  words(value)
    .map((word) => word.toLowerCase())
    .join(' ');

const tOrFallback = (t: I18nFn, keyPath: string, fallback: string): string => {
  const translated = t(keyPath);
  return translated && translated !== keyPath ? translated : fallback;
};

const entityLabel = (t: I18nFn, entity: string): string =>
  tOrFallback(t, `dashboard.activity.entities.${camelToSnake(entity)}`, humanizeEntity(entity));

const verbLabel = (t: I18nFn, verb: string): string =>
  tOrFallback(
    t,
    `dashboard.activity.actions.${camelToSnake(normalizeVerb(verb))}`,
    humanizeVerb(verb),
  );

interface TaxonomyMatch {
  category: ActivityCategory;
  rest: string;
}

/** Matches a namespaced taxonomy name against the known category prefixes. */
function matchCategory(action: string): TaxonomyMatch | null {
  for (const category of CATEGORY_PREFIXES) {
    if (action === category) return { category, rest: '' };
    if (action.startsWith(`${category}.`)) {
      return { category, rest: action.slice(category.length + 1) };
    }
  }
  return null;
}

/**
 * Maps a namespaced taxonomy name (`<domain>.<entity>.<verb>`) to a friendly
 * entity+verb label and a category badge/icon.
 *
 * Auth events read best as verb-only labels (e.g. "Inicio de sesión"), so the
 * entity prefix is dropped for `auth.session.*`.
 */
function mapTaxonomy(
  action: string,
  { category, rest }: TaxonomyMatch,
  t: I18nFn,
): ActivityActionConfig {
  const meta = CATEGORY_META[category];
  const segments = rest.split('.').filter(Boolean);
  const verb = segments.length > 0 ? segments[segments.length - 1] : '';
  const entity = segments.length > 1 ? segments[segments.length - 2] : '';

  const mappedVerb = verb ? verbLabel(t, verb) : '';
  const label =
    category === 'auth.session' || !entity
      ? mappedVerb || action
      : `${entityLabel(t, entity)} ${mappedVerb}`.trim();

  return { label, badgeClass: meta.badgeClass, category, icon: meta.icon };
}

/**
 * Maps a `legacy.*` action (unmapped legacy `DomainEvent`, `eventName = null`)
 * to a best-effort entity+verb label with the ghost badge.
 */
function mapLegacyFallback(rest: string, t: I18nFn): ActivityActionConfig {
  const segments = rest.split('.').filter(Boolean);
  const verb = segments.length > 0 ? segments[segments.length - 1] : '';
  const entity = segments.length > 1 ? segments[segments.length - 2] : '';

  const label = entity
    ? `${entityLabel(t, entity)} ${verbLabel(t, verb)}`.trim()
    : verb
      ? verbLabel(t, verb)
      : rest;

  return { label, badgeClass: 'badge-ghost', legacy: true };
}

/**
 * Backward-compatible mapping for the legacy `Entity_VERB` composite format
 * (e.g. `Patient_CREATE`, `PATIENT_ARCHIVED`) and flat `LOGIN` / `LOGOUT`.
 */
function mapLegacyEntityVerb(action: string, t: I18nFn): ActivityActionConfig | null {
  const upper = action.toUpperCase();
  if (upper === 'LOGIN') {
    return { label: t('dashboard.activity.actions.login'), badgeClass: VERB_BADGES.login, legacy: true };
  }
  if (upper === 'LOGOUT') {
    return { label: t('dashboard.activity.actions.logout'), badgeClass: VERB_BADGES.logout, legacy: true };
  }

  const match = LEGACY_ENTITY_VERB.exec(action);
  if (!match) return null;

  const entity = match[1];
  const verb = match[2].toLowerCase();
  return {
    label: `${entityLabel(t, entity)} ${verbLabel(t, verb)}`.trim(),
    badgeClass: VERB_BADGES[verb] ?? 'badge-ghost',
    legacy: true,
  };
}

/**
 * Mapea una acción cruda del log a una etiqueta amigable.
 *
 * Soporta, en orden de prioridad:
 * 1. Taxonomía namespaced `<domain>.<entity>.<verb>` (`clinical.patient.created`).
 * 2. Fallback legacy marcado `legacy.<entity>.<verb>` (filas sin `eventName`).
 * 3. Formato legacy compuesto `${entity}_${VERB}` (`PATIENT_ARCHIVED`).
 * 4. Desconocido → string crudo con badge ghost.
 */
export function getActionConfig(action: string, t: I18nFn): ActivityActionConfig {
  if (!action) return { label: '—', badgeClass: 'badge-ghost' };

  const taxonomy = matchCategory(action);
  if (taxonomy) return mapTaxonomy(action, taxonomy, t);

  if (action.startsWith(LEGACY_FALLBACK_PREFIX)) {
    return mapLegacyFallback(action.slice(LEGACY_FALLBACK_PREFIX.length), t);
  }

  const legacy = mapLegacyEntityVerb(action, t);
  if (legacy) return legacy;

  return { label: action, badgeClass: 'badge-ghost', unknown: true };
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'hace unos segundos';
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffDays < 7) return `hace ${diffDays} d`;
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getUserFullName(log: IActivityLog): string {
  return log.user?.fullName || log.user?.email || 'Usuario desconocido';
}

export function getUserInitials(log: IActivityLog): string {
  const name = getUserFullName(log);
  return name.charAt(0).toUpperCase();
}
