import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels, Result, WindowApi } from '../shared/types/ipc';

/**
 * The only bridge between the renderer and the privileged main process.
 * The renderer sees `window.api` — and nothing else.
 *
 * `invoke` mirrors the main-process contract: even if a channel has no
 * registered handler yet (a module still in development), the renderer
 * receives a well-formed Result instead of a rejected promise.
 */
async function invoke<T>(channel: string, input?: unknown): Promise<Result<T>> {
  try {
    return (await ipcRenderer.invoke(channel, input)) as Result<T>;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

const api: WindowApi = {
  app: {
    getInfo: () => invoke(IpcChannels.app.getInfo)
  },
  settings: {
    get: () => invoke(IpcChannels.settings.get),
    update: (input) => invoke(IpcChannels.settings.update, input)
  },
  categories: {
    list: () => invoke(IpcChannels.categories.list),
    create: (input) => invoke(IpcChannels.categories.create, input),
    rename: (input) => invoke(IpcChannels.categories.rename, input),
    setActive: (input) => invoke(IpcChannels.categories.setActive, input),
    remove: (input) => invoke(IpcChannels.categories.remove, input),
    reorder: (input) => invoke(IpcChannels.categories.reorder, input)
  },
  products: {
    list: (filter) => invoke(IpcChannels.products.list, filter),
    create: (input) => invoke(IpcChannels.products.create, input),
    update: (input) => invoke(IpcChannels.products.update, input),
    setActive: (input) => invoke(IpcChannels.products.setActive, input)
  },
  sales: {
    complete: (input) => invoke(IpcChannels.sales.complete, input)
  },
  businessDay: {
    getCurrent: () => invoke(IpcChannels.businessDay.getCurrent),
    performEndOfDay: () => invoke(IpcChannels.businessDay.performEndOfDay)
  },
  reports: {
    listBusinessDays: () => invoke(IpcChannels.reports.listBusinessDays),
    getEndOfDayReport: (input) => invoke(IpcChannels.reports.getEndOfDayReport, input)
  },
  voids: {
    voidCartItem: (input) => invoke(IpcChannels.voids.voidCartItem, input),
    voidCartSale: (input) => invoke(IpcChannels.voids.voidCartSale, input)
  },
  audit: {
    list: (filter) => invoke(IpcChannels.audit.list, filter)
  }
};

contextBridge.exposeInMainWorld('api', api);
