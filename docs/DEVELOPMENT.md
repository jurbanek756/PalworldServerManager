# Developer & Contributor Guide

Welcome to the **Palworld Server Monitor** developer documentation! This guide explains how to set up your environment, run the desktop application in development mode, execute unit tests, build production packages, and follow our architectural conventions.

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

# Install Node.js frontend dependencies
npm install
```

### Running Development Mode

Launch Vite frontend dev server and Tauri desktop wrapper simultaneously:

```powershell
npm run tauri dev
```

This starts hot-reload for both React components (`src/`) and Rust backend changes (`src-tauri/src/lib.rs`).

---

## 3. Running Unit Tests

The project includes unit test suites for both frontend logic (`vitest`) and backend Rust commands (`cargo test`).

### Frontend Tests (Vitest)

Execute the 29 unit tests covering formatting, IPC wrappers, type guards, and error parsing:

```powershell
npm test
```

To run vitest in watch mode:

```powershell
npx vitest
```

### Backend Tests (Cargo)

Run native Rust unit tests covering endpoint normalization, base64 encoding, and error formatting:

```powershell
cd src-tauri
cargo test
```

---

## 4. Production Packaging

To compile the optimized production release binary and generate an MSI / NSIS Windows installer:

```powershell
npm run tauri build
```

Built artifacts will be placed in:
`src-tauri/target/release/bundle/`

---

## 5. Codebase Structure & Conventions

```
palworld-server-monitor-codex/
├── src/                        # React Frontend Application
│   ├── api.ts                  # High-level API wrappers & error parsers
│   ├── components/             # React UI components & modal dialogs
│   ├── format.ts               # Formatting utilities (uptime, ping, FPS quality)
│   ├── main.tsx                # Application root component & state orchestrator
│   ├── types/
│   │   ├── guards.ts           # Runtime TypeScript type guard predicates
│   │   ├── ipc.ts              # Strongly typed Tauri IPC command registry
│   │   └── result.ts           # Result type utilities
│   └── types.ts                # Domain interfaces (Snapshot, Player, Metrics)
├── src-tauri/                  # Tauri Rust Native Host
│   ├── src/
│   │   ├── lib.rs              # Tauri command implementations & background poller
│   │   └── main.rs             # Application entrypoint
│   └── tauri.conf.json         # Tauri v2 configuration file
└── docs/                       # Project Documentation Suite
```

### Key Engineering Conventions

1. **Branded Types**: Use nominal branding (`PlayerId`, `WorldGuid`) to prevent accidental identifier string swapping.
2. **IPC Registry**: Always register new Rust `#[tauri::command]` functions in `TauriCommandRegistry` within `src/types/ipc.ts` to ensure type safety between Rust and TypeScript.
3. **No Plaintext Passwords**: Never store credentials in `localStorage` or config files. Use `credentials()` helper in Rust which routes to Windows Credential Manager.
4. **Pure Component State**: Keep transient component state local; subscribe to `onTelemetryUpdate` at the root container level.
