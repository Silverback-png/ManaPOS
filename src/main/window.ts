import { BrowserWindow, shell } from 'electron';
import * as path from 'path';

const DEV_SERVER_URL = 'http://localhost:5173';

export function createMainWindow(isDev: boolean): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0B0D10',
    title: 'ManaPOS',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      // The web page itself gets no Node.js access — only window.api.
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox stays off so the preload may require shared local modules;
      // contextIsolation still fully isolates the page.
      sandbox: false,
      spellcheck: false
    }
  });

  win.once('ready-to-show', () => win.show());

  // A POS is self-contained: never spawn new windows from content.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    void win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  return win;
}
