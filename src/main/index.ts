import { app, BrowserWindow, dialog } from 'electron';
import { createMainWindow } from './window';
import { closeDatabase, initializeDatabase } from './database';
import { registerIpcHandlers } from './ipc';

const isDev = process.env.NODE_ENV === 'development';

/**
 * A POS terminal must never run twice on the same machine — two instances
 * would fight over the SQLite database file.
 */
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  void app.whenReady().then(() => {
    try {
      initializeDatabase();
    } catch (error) {
      // A POS without its database is useless — fail loudly, not silently.
      dialog.showErrorBox(
        'ManaPOS database error',
        'The database could not be opened. The application will now close.\n\n' +
          (error instanceof Error ? error.message : String(error))
      );
      app.quit();
      return;
    }

    registerIpcHandlers();
    createMainWindow(isDev);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow(isDev);
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('will-quit', () => {
    closeDatabase();
  });
}
