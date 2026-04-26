# Dependencies

All packages are managed via npm. Run `npm install` from the project root to restore them on any machine.

---

## Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | ^18 | UI rendering |
| `react-dom` | ^18 | DOM bindings for React |
| `react-router-dom` | ^6 | Client-side routing |
| `@mantine/core` | ^7 | Component library (buttons, layout, nav, forms) |
| `@mantine/hooks` | ^7 | Mantine utility hooks |
| `postcss-preset-mantine` | ^1 | PostCSS plugin required by Mantine |
| `postcss-simple-vars` | ^7 | PostCSS variable support |
| `lucide-react` | ^0.469 | Line icon set used in the sidebar |
| `better-sqlite3` | ^12 | Synchronous SQLite driver (Electron main process only) |

---

## Dev / build-time dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | ^5.6 | TypeScript compiler |
| `vite` | ^5.4 | Web bundler / dev server (browser-only mode) |
| `electron-vite` | ^5.0.0 | Dual-build tool for Electron (main + preload + renderer) |
| `electron` | ^41.2.2 | Electron runtime |
| `electron-builder` | ^26.8.1 | Packages the Electron app into installers (NSIS, DMG, AppImage) |
| `@vitejs/plugin-react` | ^4 | Vite plugin for React / JSX transform |
| `@types/react` | ^18 | TypeScript types for React |
| `@types/react-dom` | ^18 | TypeScript types for React DOM |
| `@types/better-sqlite3` | ^7.6 | TypeScript types for better-sqlite3 |

---

## Platform / OS requirements

| Requirement | Minimum version | Notes |
|---|---|---|
| Node.js | 18 LTS | Required for npm and Vite |
| npm | 9 | Bundled with Node 18+ |
| Git | 2.x | Version control |
| OS | Windows 10 / macOS 12 / Ubuntu 20.04 | All three are supported targets |

### Native module note

`better-sqlite3` is a **native Node addon** (`.node` binary). It is compiled for the current platform and Node/Electron ABI at `npm install` time via `prebuild-install`. If you switch OS, Node version, or Electron version, run `npm rebuild better-sqlite3` to recompile it.

---

## Modes of operation

| Mode | Command | Platform target | Notes |
|---|---|---|---|
| Browser dev (in-memory) | `npm run dev` | `IN_MEMORY` | No SQLite, no Electron needed |
| Electron dev | `npm run electron:dev` | `SQLITE` | Full Electron + SQLite dev mode |
| Electron production build | `npm run electron:build` | `SQLITE` | Produces packaged installer |
| Web production build | `npm run build` | `IN_MEMORY` | Static files for web hosting |
