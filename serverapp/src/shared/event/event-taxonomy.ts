import { z } from "zod";

/**
 * Versioned event taxonomy — single source of truth for telemetry event names.
 *
 * Naming convention: `<domain>.<entity>.<verb>` (lowercase). Every event belongs
 * to a category and carries a retention window (in days) used by the retention job.
 */
export const TAXONOMY_VERSION = "v1" as const;

export enum EventCategory {
  AUTH = "auth.session",
  CLINICAL = "clinical",
  LIBRARY = "library.tools",
  BILLING = "billing",
  ADMIN = "admin",
  ORG = "org.tenant",
  ERP = "erp.business",
}

/** Retention windows per category (spec: auth 12m, clinical 24m, library 12m, billing 7y, admin 24m, org 12m). */
export const RETENTION_DAYS: Record<EventCategory, number> = {
  [EventCategory.AUTH]: 365,
  [EventCategory.CLINICAL]: 730,
  [EventCategory.LIBRARY]: 365,
  [EventCategory.BILLING]: 2555,
  [EventCategory.ADMIN]: 730,
  [EventCategory.ORG]: 365,
  [EventCategory.ERP]: 730,
};

export interface EventDefinition {
  readonly category: EventCategory;
  readonly version: string;
  readonly retentionDays: number;
}

export const EVENT_TAXONOMY = {
  // auth.session
  "auth.session.login": {
    category: EventCategory.AUTH,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.AUTH],
  },
  "auth.session.logout": {
    category: EventCategory.AUTH,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.AUTH],
  },
  "auth.session.failed_login": {
    category: EventCategory.AUTH,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.AUTH],
  },
  "auth.session.session_refresh": {
    category: EventCategory.AUTH,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.AUTH],
  },
  "auth.session.password_reset": {
    category: EventCategory.AUTH,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.AUTH],
  },

  // clinical
  "clinical.patient.created": {
    category: EventCategory.CLINICAL,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.CLINICAL],
  },
  "clinical.patient.archived": {
    category: EventCategory.CLINICAL,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.CLINICAL],
  },
  "clinical.consultation.started": {
    category: EventCategory.CLINICAL,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.CLINICAL],
  },
  "clinical.consultation.completed": {
    category: EventCategory.CLINICAL,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.CLINICAL],
  },
  "clinical.plan.created": {
    category: EventCategory.CLINICAL,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.CLINICAL],
  },
  "clinical.note.saved": {
    category: EventCategory.CLINICAL,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.CLINICAL],
  },

  // library.tools
  "library.tools.food.viewed": {
    category: EventCategory.LIBRARY,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.LIBRARY],
  },
  "library.tools.food.searched": {
    category: EventCategory.LIBRARY,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.LIBRARY],
  },
  "library.tools.calculator.used": {
    category: EventCategory.LIBRARY,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.LIBRARY],
  },
  "library.tools.recipe.created": {
    category: EventCategory.LIBRARY,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.LIBRARY],
  },

  // billing
  "billing.subscription.renewed": {
    category: EventCategory.BILLING,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.BILLING],
  },
  "billing.payment.failed": {
    category: EventCategory.BILLING,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.BILLING],
  },
  "billing.plan.changed": {
    category: EventCategory.BILLING,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.BILLING],
  },

  // admin
  "admin.user.role_changed": {
    category: EventCategory.ADMIN,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ADMIN],
  },
  "admin.org.created": {
    category: EventCategory.ADMIN,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ADMIN],
  },
  "admin.setting.updated": {
    category: EventCategory.ADMIN,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ADMIN],
  },
  "admin.data.exported": {
    category: EventCategory.ADMIN,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ADMIN],
  },

  // org.tenant
  "org.tenant.workspace.created": {
    category: EventCategory.ORG,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ORG],
  },
  "org.tenant.member.invited": {
    category: EventCategory.ORG,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ORG],
  },
  "org.tenant.member.removed": {
    category: EventCategory.ORG,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ORG],
  },
  "org.tenant.workspace.switched": {
    category: EventCategory.ORG,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ORG],
  },

  // erp.business (Socius ERP)
  "erp.sale.created": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.sale.payment_received": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.sale.returned": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.sale.cancelled": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.purchase.created": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.purchase.received": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.purchase.payment_made": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.order.received": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.order.status_changed": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.order.converted": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.product.stock_adjusted": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.cash.shift_opened": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.cash.shift_closed": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
  "erp.cash.movement_recorded": {
    category: EventCategory.ERP,
    version: TAXONOMY_VERSION,
    retentionDays: RETENTION_DAYS[EventCategory.ERP],
  },
} as const satisfies Record<string, EventDefinition>;

export type EventName = keyof typeof EVENT_TAXONOMY;

export const EVENT_NAMES = Object.keys(EVENT_TAXONOMY) as EventName[];

export class UnknownEventError extends Error {
  constructor(name: string) {
    super(`Unknown telemetry event name: "${name}"`);
    this.name = "UnknownEventError";
  }
}

export function isEventName(name: string): name is EventName {
  return Object.prototype.hasOwnProperty.call(EVENT_TAXONOMY, name);
}

export function getEventDefinition(name: string): EventDefinition {
  if (!isEventName(name)) {
    throw new UnknownEventError(name);
  }
  return EVENT_TAXONOMY[name];
}

export const EventNameSchema = z.enum(EVENT_NAMES as [EventName, ...EventName[]]);

export const EventCategorySchema = z.enum(
  Object.values(EventCategory) as [string, ...string[]],
);
