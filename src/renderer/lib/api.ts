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
} from '@shared/types/domain';
import type { AppInfo, Result } from '@shared/types/ipc';

/**
 * The renderer's typed client for the main process.
 *
 * `window.api` (the preload bridge) speaks in Result<T> envelopes; this
 * wrapper unwraps them so feature code uses ordinary async/await with
 * try/catch — and can never forget to check `ok`.
 */
async function unwrap<T>(promise: Promise<Result<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data;
}

export const api = {
  app: {
    getInfo: (): Promise<AppInfo> => unwrap(window.api.app.getInfo())
  },
  settings: {
    get: (): Promise<AppSettings> => unwrap(window.api.settings.get()),
    update: (input: UpdateSettingsInput): Promise<AppSettings> =>
      unwrap(window.api.settings.update(input))
  },
  categories: {
    list: (): Promise<Category[]> => unwrap(window.api.categories.list()),
    create: (input: CreateCategoryInput): Promise<Category> =>
      unwrap(window.api.categories.create(input)),
    rename: (input: RenameCategoryInput): Promise<Category> =>
      unwrap(window.api.categories.rename(input)),
    setActive: (input: SetCategoryActiveInput): Promise<Category> =>
      unwrap(window.api.categories.setActive(input)),
    remove: (input: DeleteCategoryInput): Promise<null> =>
      unwrap(window.api.categories.remove(input)),
    reorder: (input: ReorderCategoriesInput): Promise<Category[]> =>
      unwrap(window.api.categories.reorder(input))
  },
  products: {
    list: (filter: ProductFilter): Promise<Product[]> =>
      unwrap(window.api.products.list(filter)),
    create: (input: CreateProductInput): Promise<Product> =>
      unwrap(window.api.products.create(input)),
    update: (input: UpdateProductInput): Promise<Product> =>
      unwrap(window.api.products.update(input)),
    setActive: (input: SetProductActiveInput): Promise<Product> =>
      unwrap(window.api.products.setActive(input))
  },
  sales: {
    complete: (input: CompleteSaleInput): Promise<CompletedSale> =>
      unwrap(window.api.sales.complete(input))
  },
  businessDay: {
    getCurrent: (): Promise<BusinessDay> => unwrap(window.api.businessDay.getCurrent()),
    performEndOfDay: (): Promise<EndOfDayResult> =>
      unwrap(window.api.businessDay.performEndOfDay())
  },
  reports: {
    listBusinessDays: (): Promise<BusinessDay[]> => unwrap(window.api.reports.listBusinessDays()),
    getEndOfDayReport: (input: { businessDayId: number }): Promise<EndOfDayReport> =>
      unwrap(window.api.reports.getEndOfDayReport(input))
  },
  voids: {
    voidCartItem: (input: VoidCartItemInput): Promise<VoidRecord> =>
      unwrap(window.api.voids.voidCartItem(input)),
    voidCartSale: (input: VoidCartSaleInput): Promise<VoidRecord> =>
      unwrap(window.api.voids.voidCartSale(input))
  },
  audit: {
    list: (filter: AuditListFilter): Promise<AuditLogEntry[]> =>
      unwrap(window.api.audit.list(filter))
  }
};
