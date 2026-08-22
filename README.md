# ManaPOS

A professional desktop Point of Sale (POS) application for Linux, built for
retail environments that need speed, reliability and complete offline operation.

> **Status:** Version 1.0.0 — feature complete, packaged for Linux.
>
> **Branch:** `linux` — the Linux (Debian/Ubuntu) build. The Windows version
> lives on the `main` branch. Both share identical application code; only
> packaging, npm scripts and documentation differ.

## Overview

ManaPOS is a **pure desktop application**. It runs as a native Linux program
(Electron bundles Chromium + Node.js into a single executable) and stores all
data locally in SQLite. There is no web server, no cloud dependency and no
internet requirement.

### Version 1 Scope

- Category management (add / rename / delete / enable / disable / reorder)
- Product management (add / edit / deactivate / search / filter — never hard-delete)
- Point of Sale screen (category rail, product grid, cart)
- Checkout (cash / card; mixed payments placeholder)
- Automatic PDF receipts saved to `~/Documents/POS Reports/Sales/`
- Voids protected by manager PIN, with a full audit log
- End of Day reports saved to `~/Documents/POS Reports/End Of Day/`
- Automatic database backups saved to `~/Documents/POS Reports/Backups/`
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

## Prerequisites (Linux)

- Debian 12 / Ubuntu 22.04 or newer (any distro with a recent glibc works)
- Node.js 20+
- Electron runtime libraries (present on any desktop system; needed explicitly
  on minimal/container installs):

  ```bash
  sudo apt install -y libgtk-3-0 libnss3 libasound2
  ```

  To *run* an AppImage you additionally need FUSE:

  ```bash
  sudo apt install -y fuse libfuse2
  ```

No C++ build tools are required: `better-sqlite3` is installed from an
official prebuilt binary matched to the Electron ABI (see `install:sqlite`) —
`prebuild-install` automatically selects the linux-x64 prebuilt on Linux.
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
| `npm run dist:linux`    | Build + package AppImage + .deb into `release/`                |
| `npm run dist`          | Build + package the Windows installer (Windows hosts only)     |

> Use `npm run setup` for the first install (and after upgrading Electron or
> better-sqlite3). It installs with `--ignore-scripts` because better-sqlite3's
> own install script targets Node, not Electron. Plain `npm install <pkg>` is
> fine when adding day-to-day dependencies afterwards.

> **Reproducible installs:** to get exactly the tested dependency tree (e.g. on
> a fresh machine or CI), prefer `npm ci` over `npm install` — it installs
> straight from `package-lock.json` and never re-resolves versions. This
> matters for packaging: see Troubleshooting below.

## Troubleshooting

**`npm run dist:linux` fails with `Package subpath ./blake2.js is not defined
by "exports" in .../@noble/hashes/package.json`**

electron-builder's `app-builder-lib` requires `@noble/hashes/blake2.js`, but
`@noble/hashes@2.3.0` removed that subpath export. A plain `npm install` can
pull the newer version and break packaging. The repo pins a known-good version
via an `overrides` entry in `package.json` (`app-builder-lib` →
`@noble/hashes@2.2.0`), and `package-lock.json` locks the full tree. Fix:

```bash
rm -rf node_modules package-lock.json   # only if your tree is already broken
git checkout package-lock.json          # restore the locked tree
npm ci                                  # install exactly the pinned versions
```

Then re-run `npm run dist:linux`.

## Packaging (AppImage + .deb)

`npm run dist:linux` compiles the app and produces two artifacts in `release/`
(configuration: `electron-builder.yml`):

- `ManaPOS-<version>.AppImage` — portable, runs on any distro
- `ManaPOS_<version>_amd64.deb` — integrates with apt (menu entry, icon)

- The native SQLite module ships as the pinned Electron prebuilt
  (`npmRebuild: false`) — never let the packager rebuild it from source.
- The first packaging run downloads the AppImage/deb toolchain once (network
  required); afterwards packaging works fully offline.
- The packages are **unsigned** — expected for an internal v1.

## Installing on a till PC

**AppImage:**

```bash
chmod +x ManaPOS-<version>.AppImage
./ManaPOS-<version>.AppImage
```

**Debian/Ubuntu package:**

```bash
sudo apt install ./release/ManaPOS_<version>_amd64.deb
```

First launch automatically creates the database and report folders (see Data
Locations) with default settings and an open business day — no setup required.
Configure business details, VAT %, manager PIN and currency symbol under
**Settings**, then add categories and products.

The database starts empty by design — no demo data ships with the packages.

## Running inside an LXC container (Proxmox)

**Building** in a headless Debian 12 container works exactly as described
above — no display is needed for `npm run setup`, `npm run build` or
`npm run dist:linux`.

**Running** the app is different: Electron is a GUI application and needs a
display. In a container that means one of:

- X11 forwarding: `ssh -X user@container` (install `xauth` in the container)
- A lightweight desktop + remote access (e.g. XFCE + x11vnc or RDP)
- Or simply run the AppImage on any Linux desktop instead

If Chromium's sandbox is blocked inside the container (typical error mentions
`SUID sandbox` or `user namespace`), either launch with `--no-sandbox`:

```bash
./ManaPOS-<version>.AppImage --no-sandbox
```

or allow unprivileged user namespaces on the container:

```bash
sysctl -w kernel.unprivileged_userns_clone=1
```

For a local, trusted, offline POS app, `--no-sandbox` is an acceptable
pragmatic choice inside a private container.

## Data Locations

| What               | Where                                |
| ------------------ | ------------------------------------ |
| Database           | `~/.config/ManaPOS/manapos.db`       |
| Receipts           | `~/Documents/POS Reports/Sales/`     |
| End-of-Day reports | `~/Documents/POS Reports/End Of Day/`|
| Backups            | `~/Documents/POS Reports/Backups/`   |

(On minimal systems without XDG user dirs, Electron may resolve Documents to
the home folder; the app creates every folder it needs on first launch.)

## License

Proprietary — all rights reserved.
