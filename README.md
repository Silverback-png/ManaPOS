# ManaPOS

A professional desktop Point of Sale (POS) application for Windows, built for
retail environments that need speed, reliability and complete offline operation.

> **Status:** Version 1.0.0 — feature complete, packaged for Windows.

## Overview

ManaPOS is a **pure desktop application**. It runs as a native Windows program
(Electron bundles Chromium + Node.js into a single executable) and stores all
data locally in SQLite. There is no web server, no cloud dependency and no
internet requirement.

### Version 1 Scope

- Category management (add / rename / delete / enable / disable / reorder)
- Product management (add / edit / deactivate / search / filter — never hard-delete)
- Point of Sale screen (category rail, product grid, cart)
- Checkout (cash / card; mixed payments placeholder)
- Automatic PDF receipts saved to `Documents/POS Reports/Sales/`
- Voids protected by manager PIN, with a full audit log
- End of Day reports saved to `Documents/POS Reports/End Of Day/`
- Automatic database backups saved to `Documents/POS Reports/Backups/`
- Settings (business details, VAT %, receipt footer, manager PIN, currency symbol)

Explicitly out of scope for v1 (the architecture is prepared for them):
inventory management, stock take, suppliers, customer accounts, employee
accounts, cloud sync, online databases, barcode scanning.

## Tech Stack

| Layer         | Technology                    |
| ------------- | ----------------------------- |
| Desktop shell | Electron                      |
| UI            | React 18 + TypeScript         |
| Styling       | TailwindCSS (dark theme)      |
| Build         | Vite (renderer) + tsc (main)  |
| Database      | SQLite via better-sqlite3     |
| PDF           | PDFKit                        |

## Project Structure

```
src/
  shared/        Types + constants shared by main and renderer (single source of truth)
  main/          Electron main process — owns the database, files and all business logic
    database/      Connection, migrations, seed
    repositories/  SQL data access (the only place SQL exists)
    services/      Business logic (no SQL, no Electron imports)
    ipc/           IPC handlers (thin: validate input -> call service -> Result<T>)
    pdf/           Receipt + End-of-Day PDF generation
    utils/         Paths, money math
  preload/       contextBridge — the only door into the main process
  renderer/      React UI — pure presentation, zero business logic
    components/    ui/ and layout/ reusable components
    features/      pos, checkout, categories, products, reports, settings
    store/         Client state (cart)
    lib/           Typed API wrapper, formatting helpers
```

## Prerequisites

- Windows 10/11
- Node.js 20+

No C++ build tools are required: `better-sqlite3` is installed from an
official prebuilt binary matched to the Electron ABI (see `install:sqlite`).
For this to work, the Electron major version is pinned to one with a published
prebuilt — do not upgrade Electron without checking prebuilt availability.

## Scripts

| Command                 | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `npm run setup`         | First-time setup: install deps + prebuilt SQLite + Electron    |
| `npm run dev`           | Run the app in development mode (hot-reload renderer)          |
| `npm run build`         | Compile main, preload and renderer into `dist/`                |
| `npm start`             | Build and launch the production app                            |
| `npm run typecheck`     | Type-check all three TypeScript projects                       |
| `npm run install:sqlite`| Re-fetch the better-sqlite3 prebuilt binary for Electron       |
| `npm run icon`          | Regenerate the app icon (`build/icon.png`)                     |
| `npm run pack`          | Build + package to an unpacked dir (no installer, for testing) |
| `npm run dist`          | Build + package the Windows installer into `release/`          |

> Use `npm run setup` for the first install (and after upgrading Electron or
> better-sqlite3). It installs with `--ignore-scripts` because better-sqlite3's
> own install script targets Node, not Electron. Plain `npm install <pkg>` is
> fine when adding day-to-day dependencies afterwards.

## Packaging (Windows installer)

`npm run dist` compiles the app and produces a one-click NSIS installer at
`release/ManaPOS-Setup-<version>.exe` (configuration: `electron-builder.yml`).

- **Per-user install** — no admin rights needed on the customer's PC. Lands in
  `%LOCALAPPDATA%\Programs\ManaPOS` with Desktop + Start Menu shortcuts and a
  standard uninstaller (Windows Settings → Apps).
- The native SQLite module ships as the pinned Electron prebuilt
  (`npmRebuild: false`) — never let the packager rebuild it from source.
- The first packaging run downloads the NSIS toolchain once (network
  required); afterwards packaging works fully offline.
- The installer is **unsigned**, so Windows SmartScreen shows
  "Windows protected your PC" on first run → **More info → Run anyway**.
  (A code-signing certificate removes this; out of scope for v1.)

## Installing on a customer's PC

1. Copy `ManaPOS-Setup-<version>.exe` onto the PC and run it.
2. Launch ManaPOS from the Desktop shortcut. First launch automatically
   creates the database and report folders (see Data Locations) with default
   settings and an open business day — no setup required.
3. Configure business details, VAT %, manager PIN and currency symbol under
   **Settings**, then add categories and products.

The database starts empty by design — no demo data ships with the installer.

## Data Locations


| What              | Where                                |
| ----------------- | ------------------------------------ |
| Database          | `%APPDATA%/ManaPOS/manapos.db`       |
| Receipts          | `Documents/POS Reports/Sales/`       |
| End-of-Day reports| `Documents/POS Reports/End Of Day/`  |
| Backups           | `Documents/POS Reports/Backups/`     |

## License

Proprietary — all rights reserved.
