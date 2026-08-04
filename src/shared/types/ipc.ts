/**
 * IPC contract shared between the main process and the renderer.
 *
 * Rules that keep the architecture maintainable:
 *  - One channel per operation. Channels are never reused for multiple jobs.
 *  - Every handler returns Result<T> so the renderer never has to try/catch
 *    across the IPC boundary.
 *  - WindowApi (below) is the single source of truth for the preload bridge:
 *    the preload implements it, the renderer consumes it. Domain sections
 *    are added to it as their modules are delivered.
 */

import type {
  AppSettings,
  AuditListFilter,
  AuditLogEntry,
  BusinessDay,
  Category,
  CompleteSaleInput,
  CompletedSale,
  CreateCategoryInput,
  CreateProductInput,
  DeleteCategoryInput,
  EndOfDayReport,
  EndOfDayResult,
  Product,
  ProductFilter,
  RenameCategoryInput,
  ReorderCategoriesInput,
  SetCategoryActiveInput,
  SetProductActiveInput,
  UpdateProductInput,
  UpdateSettingsInput,
  VoidCartItemInput,
  VoidCartSaleInput,
  VoidRecord
} from './domain';

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface AppInfo {
  version: string;
  platform: string;
  electron: string;
  chrome: string;
  node: string;
}

/**
 * Every IPC channel in the application, namespaced by domain.
 * Declaring the full map up front keeps channel naming consistent and
 * prevents collisions as feature modules land.
 */
export const IpcChannels = {
  app: {
    getInfo: 'app:get-info'
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update'
  },
  categories: {
    list: 'categories:list',
    create: 'categories:create',
    rename: 'categories:rename',
    setActive: 'categories:set-active',
    remove: 'categories:remove',
    reorder: 'categories:reorder'
  },
  products: {
    list: 'products:list',
    create: 'products:create',
    update: 'products:update',
    setActive: 'products:set-active'
  },
  sales: {
    complete: 'sales:complete'
  },
  voids: {
    voidCartItem: 'voids:void-cart-item',
    voidCartSale: 'voids:void-cart-sale',
    listByBusinessDay: 'voids:list-by-business-day'
  },
  businessDay: {
    getCurrent: 'business-day:get-current',
    performEndOfDay: 'business-day:perform-end-of-day'
  },
  reports: {
    listBusinessDays: 'reports:list-business-days',
    getEndOfDayReport: 'reports:get-end-of-day-report'
  },
  audit: {
    list: 'audit:list'
  }
} as const;

/**
 * The API surface exposed to the renderer as `window.api` via the preload
 * contextBridge. The renderer has no other access to privileged APIs.
 */
export interface WindowApi {
  app: {
    getInfo: () => Promise<Result<AppInfo>>;
  };
  settings: {
    get: () => Promise<Result<AppSettings>>;
    update: (input: UpdateSettingsInput) => Promise<Result<AppSettings>>;
  };
  categories: {
    list: () => Promise<Result<Category[]>>;
    create: (input: CreateCategoryInput) => Promise<Result<Category>>;
    rename: (input: RenameCategoryInput) => Promise<Result<Category>>;
    setActive: (input: SetCategoryActiveInput) => Promise<Result<Category>>;
    remove: (input: DeleteCategoryInput) => Promise<Result<null>>;
    reorder: (input: ReorderCategoriesInput) => Promise<Result<Category[]>>;
  };
  products: {
    list: (filter: ProductFilter) => Promise<Result<Product[]>>;
    create: (input: CreateProductInput) => Promise<Result<Product>>;
    update: (input: UpdateProductInput) => Promise<Result<Product>>;
    setActive: (input: SetProductActiveInput) => Promise<Result<Product>>;
  };
  sales: {
    complete: (input: CompleteSaleInput) => Promise<Result<CompletedSale>>;
  };
  businessDay: {
    getCurrent: () => Promise<Result<BusinessDay>>;
    performEndOfDay: () => Promise<Result<EndOfDayResult>>;
  };
  reports: {
    listBusinessDays: () => Promise<Result<BusinessDay[]>>;
    getEndOfDayReport: (input: { businessDayId: number }) => Promise<Result<EndOfDayReport>>;
  };
  voids: {
    voidCartItem: (input: VoidCartItemInput) => Promise<Result<VoidRecord>>;
    voidCartSale: (input: VoidCartSaleInput) => Promise<Result<VoidRecord>>;
  };
  audit: {
    list: (filter: AuditListFilter) => Promise<Result<AuditLogEntry[]>>;
  };
}
