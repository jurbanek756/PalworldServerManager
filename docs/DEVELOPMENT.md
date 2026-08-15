# Developer & Contributor Guide

Welcome to the **Palworld Server Monitor** developer documentation! This guide explains how to set up your environment, run the desktop application in development mode, execute automated tests, run build scripts, understand our CI/CD pipelines, and follow architectural conventions.

---

## 1. Environment & Prerequisites

To develop or build Palworld Server Monitor on Windows, ensure you have the following installed:

- **Node.js**: LTS version (18.x or 20.x recommended)
- **Rust Toolchain**: `rustc` and `cargo` (installed via [rustup.rs](https://rustup.rs/))
- **Windows Build Tools**: C++ build tools for Visual Studio 2022 / Windows SDK
- **WebView2 Runtime**: Default on modern Windows 10 & 11 installations.

---

## 2. Getting Started

### Clone & Install Dependencies

```powershell
# Clone the repository
git clone https://github.com/your-org/palworld-server-monitor.git
cd palworld-server-monitor

# Install Node.js frontend dependencies (triggers predev script to prepare Paldex data)
npm install
```

### Running Development Mode

Launch Vite frontend dev server and Tauri desktop wrapper simultaneously:

```powershell
npm run tauri dev
```

This automatically runs `prepare-paldex.js` to ensure the Paldex API data archive is downloaded, SHA-256 verified, and extracted, then starts hot-reload for both React components (`src/`) and Rust backend changes (`src-tauri/src/lib.rs`).

---

## 3. Automated Test Suite (43 Tests)

The project includes automated test suites for both frontend TypeScript logic (`vitest`) and backend Rust commands (`cargo test`).

### Frontend Tests (Vitest - 36 Tests)

Execute the 36 unit tests covering formatting utilities, IPC wrappers, type guards, error parsing, and Paldex search/filtering services:

```powershell
npm test
```

Test files:
- `src/format.test.ts` (7 tests): Uptime, ping formatting, FPS quality metrics.
- `src/api.test.ts` (16 tests): Error parsing and troubleshooting mappings.
- `src/types.test.ts` (6 tests): Type guard predicates and result wrappers.
- `src/services/paldexService.test.ts` (7 tests): Paldex encyclopedia queries and suitability filters.

To run Vitest in watch mode during active development:

```powershell
npx vitest
```

### Backend Tests (Cargo - 7 Tests)

Run native Rust unit tests covering endpoint normalization, base64 encoding, JSON deserialization aliases, and error formatting:

```powershell
cd src-tauri
cargo test
```

---

## 4. Build Scripts & Automation Tools

The repository includes specialized build scripts located in [`scripts/`](../scripts):

### Paldex API Data Pipeline (`scripts/prepare-paldex.js`)
- **Execution Hook**: Triggered automatically before `dev` (`npm run predev`) and `build` (`npm run prebuild`).
- **Functionality**:
  1. Downloads Paldex API release archive tarball (`v1.3.0`).
  2. Verifies cryptographic **SHA-256 checksum** (`20cf71a98144ee792ff...`) for supply chain security.
  3. Extracts JSON dataset and media assets to `src/assets/paldex` and `public/paldex`.

### Semantic Version Synchronizer (`scripts/sync-version.js`)
- **Execution**: `npm run version:sync` or `npm run version [VERSION]`
- **Functionality**: Synchronizes semantic version numbers across `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` to prevent version drift.

---

## 5. Production Packaging & CI/CD Pipelines

### Building Release Installer

To compile the optimized production release binary and generate an MSI / NSIS Windows installer:

```powershell
npm run tauri build
```

Built artifacts will be placed in:
`src-tauri/target/release/bundle/`

### CI/CD Workflows (`.github/workflows/`)

- **CI Pipeline (`.github/workflows/ci.yml`)**:
  - Triggers on push and pull requests to `master`.
  - Runs Node.js dependency installation and Paldex data preparation.
  - Executes TypeScript strict typechecking (`npx tsc --noEmit`).
  - Executes Vitest unit tests (`npm test`).
  - Audits Node.js dependencies (`npm audit --audit-level=high`).
  - Validates Rust workspace build (`cargo check`) and runs Rust unit tests (`cargo test`).
  - Audits Rust crate dependencies via `cargo-audit`.
- **Release Pipeline (`.github/workflows/release.yml`)**:
  - Triggers on release tags (`v*`).
  - Packages and uploads standalone Windows executable and MSI installers to GitHub Releases.

---

## 6. Codebase Structure & Conventions

```
palworld-server-monitor-codex/
├── src/                        # React Frontend Application
│   ├── api.ts                  # High-level API wrappers & error parsers
│   ├── components/             # React UI components & modal dialogs
│   │   ├── PaldexTab.tsx       # Paldex encyclopedia tab
│   │   ├── HabitantHistoryTable.tsx # SQLite player analytics view
│   │   └── OverviewTab.tsx     # Main telemetry dashboard
│   ├── format.ts               # Formatting utilities (uptime, ping, FPS quality)
│   ├── main.tsx                # Application root component & state orchestrator
│   ├── services/
│   │   └── paldexService.ts    # Paldex search & indexing service
│   ├── types/
│   │   ├── guards.ts           # Runtime TypeScript type guard predicates
│   │   ├── ipc.ts              # Strongly typed Tauri IPC command registry (17 commands)
│   │   ├── paldex.ts           # Paldex domain interfaces
│   │   └── result.ts           # Result type utilities
│   └── types.ts                # Domain interfaces (Snapshot, Player, Metrics, SqliteInfo)
├── src-tauri/                  # Tauri Rust Native Host
│   ├── src/
│   │   ├── lib.rs              # Tauri command implementations, poller & SQLite storage
│   │   └── main.rs             # Application entrypoint
│   └── tauri.conf.json         # Tauri v2 configuration file
├── scripts/                    # Build & automation scripts
│   ├── prepare-paldex.js       # Paldex API archive fetcher & SHA-256 verifier
│   └── sync-version.js         # Cross-file version sync script
└── docs/                       # Project Documentation Suite
    └── images/                 # UI rendered mockup screenshots
```

### Key Engineering Conventions

1. **Branded Types**: Use nominal branding (`PlayerId`, `WorldGuid`) to prevent accidental identifier string swapping.
2. **IPC Registry**: Always register new Rust `#[tauri::command]` functions in `TauriCommandRegistry` within `src/types/ipc.ts` to ensure full type safety between Rust and TypeScript.
3. **No Plaintext Passwords**: Never store credentials in `localStorage` or config files. Use `credentials()` helper in Rust which routes to Windows Credential Manager.
4. **Pure Component State**: Keep transient component state local; subscribe to `onTelemetryUpdate` at the root container level.
