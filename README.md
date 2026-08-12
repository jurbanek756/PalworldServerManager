# Palworld Server Monitor

[![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue.svg)](https://tauri.app/)
[![React 18](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-1.75+-orange.svg)](https://www.rust-lang.org/)
[![Tests](https://img.shields.io/badge/Tests-29%20passed-emerald.svg)]()

A high-performance Windows desktop monitoring and server administration application for Palworld dedicated servers. Built with **Tauri v2**, **Rust**, **React 18**, **TypeScript**, and **Tailwind CSS**.

---

## 🌟 Key Features

- ⚡ **Real-Time Telemetry Polling**: Automatic 3-second background polling of server tick rates (FPS), frame time, player count, uptime, base camps, and in-game day cycles.
- 👥 **Active Player Directory**: Live table of connected players with level, ping, coordinates, building counts, search filtering, and single-click Kick/Ban actions.
- 🎮 **Game Entity Inspector**: Deep breakdown of world actors (Pals, Bosses, Rare/Lucky Pals, Guilds, HP, AI Actions).
- 📢 **In-Game Announcements**: Broadcast server-wide system messages directly to active players.
- ⚙️ **Server Administration**: Remote world state saving (`/save`), scheduled graceful shutdowns with custom delays and messages (`/shutdown`), and emergency stop (`/stop`).
- 🔒 **Enterprise-Grade Security**: Passwords saved securely in **Windows Credential Manager** via the Rust `keyring` crate. Passwords are never stored in plaintext or browser storage.

---

## 📁 Documentation Directory

Comprehensive documentation is available in the [`docs/`](./docs) folder:

- 🏗️ **[Architecture Overview](./docs/ARCHITECTURE.md)**: System design, Mermaid sequence diagrams, IPC flow, security model, and error handling architecture.
- 🔌 **[API & IPC Reference](./docs/API_IPC_REFERENCE.md)**: Complete guide to all 14 Tauri IPC commands, TypeScript helpers, event listeners, and Palworld REST API mappings.
- 📖 **[User & Operator Guide](./docs/USER_GUIDE.md)**: Step-by-step setup guide for `PalWorldSettings.ini`, connection instructions, tab walkthroughs, and troubleshooting.
- 💻 **[Developer & Contributor Guide](./docs/DEVELOPMENT.md)**: Development setup, Vitest & Cargo testing instructions, production builds, and coding conventions.

---

## 🚀 Quick Start

### Prerequisites

- **Windows 10 / 11** with WebView2 runtime installed.
- **Node.js 18+** & **Rust toolchain** (`rustc`, `cargo`).
- A running Palworld dedicated server with `RESTAPIEnabled=True` and `AdminPassword` configured in `PalWorldSettings.ini` (default REST API port: `8212`).

### Running in Development Mode

```powershell
# 1. Clone repository & install dependencies
npm install

# 2. Run Tauri desktop app in dev mode (hot reload enabled)
npm run tauri dev
```

### Running Tests

```powershell
# Run unit test suite (29 passing tests)
npm test
```

### Building Windows Installer

```powershell
# Package standalone executable & MSI installer
npm run tauri build
```

---

## 🛡️ Security Model

Palworld Server Monitor connects directly to your server's REST API endpoint over HTTP/HTTPS using Basic Authentication.

```
+-------------------------------------------------------------------+
|                        CREDENTIAL STORAGE                         |
+-------------------------------------------------------------------+
|  Endpoint & Username  -->  %APPDATA%/connection.json (Plaintext)  |
|  Admin Password       -->  Windows Credential Manager (Encrypted) |
+-------------------------------------------------------------------+
```

- Passwords are routed straight to **Windows Credential Manager** under `Palworld Server Monitor`.
- Do **NOT** expose your server's REST API port (8212) directly to the public internet without a firewall or VPN.

---

## 📄 License

MIT License. Free to use and modify for private and public Palworld server management.
