# User & Operator Guide: Palworld Server Monitor

**Palworld Server Monitor** is a dedicated Windows desktop application designed to give Palworld server administrators real-time visibility into server metrics, active players, persistent inhabitant session history, Paldex encyclopedic reference data, in-game entity states, and diagnostic health—along with administrative controls to manage server state and moderate players safely.

---

## 1. Prerequisites & Palworld Server Setup

To connect the application to your Palworld server, your dedicated server must have its **REST API interface enabled**.

### Enabling REST API in `PalWorldSettings.ini`

1. Open your server's `PalWorldSettings.ini` file (typically located at `PalServer/Pal/Saved/Config/WindowsServer/PalWorldSettings.ini` or Linux equivalent).
2. Ensure the following settings are present inside `[/Script/Pal.PalGameWorldSettings]`:
   ```ini
   RESTAPIEnabled=True
   RESTAPIPort=8212
   AdminPassword="YourSecureAdminPassword"
   ```
3. Restart your Palworld server process.
4. **Security Notice**: Do **NOT** expose port 8212 directly to the public internet without firewall protection or a VPN. The REST API relies on HTTP Basic Authentication.

---

## 2. Connecting to Your Server

When you launch **Palworld Server Monitor**:

1. Click **Connect Server** (or the Settings icon in the titlebar).
2. Enter your server connection parameters:
   - **Server Endpoint URL**: E.g. `http://localhost:8212` or `http://192.168.1.100:8212`.
     *(Note: If you enter `http://192.168.1.100:8212`, the app automatically appends `/v1/api` for canonical REST compliance).*
   - **Username**: `admin` (Default username used by Palworld REST API).
   - **Password**: Enter the `AdminPassword` configured in your server settings.
3. Click **Connect to Server**.

> **Credential Security**: Your password is stored securely in **Windows Credential Manager** under the service name `Palworld Server Monitor`. The application configuration file (`connection.json`) only retains non-sensitive parameters (`endpoint` and `username`).

---

## 3. Application Navigation & Tabs

### 📊 Overview Tab
The primary telemetry dashboard displaying real-time server health updated every 3 seconds:
- **Server FPS**: Highlights tick rate quality (Optimal 55-60 FPS in green, Stable 30-54 FPS in amber, Degraded <30 FPS in red).
- **Active Players**: Online count vs. maximum server capacity (`currentplayernum / maxplayernum`).
- **Server Frame Time**: Average latency per tick in milliseconds.
- **Continuous Uptime**: Displayed in formatted days, hours, minutes, and seconds (`Xd Xh Xm Xs`).
- **Base Camps & In-Game Days**: Total active base camps constructed and elapsed in-game days.
- **Telemetry Sparkline Charts**: Live visual performance trends over time.

---

### 👥 Players Tab & Inhabitant History
A real-time directory of all currently online players and persistent player analytics:
- **Search Filter**: Instantly search by character name, account name, IP address, or User ID.
- **Player Details**: View Level, Ping (ms), In-game coordinates (X, Y), and Building Count for each connected player.
- **Moderation Actions**:
  - **Kick Player**: Disconnects the player with a custom reason message.
  - **Ban Player**: Immediately disconnects and adds the player to the server ban list.
- **💾 Inhabitant History & Session Inspector**:
  - Toggle historical inhabitant database records backed by SQLite.
  - Track total cumulative playtime, first/last seen timestamps, peak level achieved, and individual login/logout session duration history.

---

### 📖 Paldex Tab
A complete in-app Palworld encyclopedia and reference compendium:
- **Search Engine**: Search over 137+ Pals by name, ID number, partner skill, or drop material (e.g., *Lamball*, *Pal Oil*, *Meteor*).
- **Elemental Filtering**: Filter Pals by elemental attribute (*Fire*, *Water*, *Grass*, *Electric*, *Ice*, *Ground*, *Dragon*, *Dark*, *Neutral*).
- **Work Suitability Filters**: Filter Pals by work type (*Kindling*, *Watering*, *Planting*, *Handiwork*, *Lumbering*, *Mining*, etc.).
- **Pal Dossier Modal**: Click any Pal card to inspect base stats (HP, Attack, Defense), full drop item tables with drop rates, and partner skills.

---

### 🎮 Game Data Tab
An advanced diagnostic breakdown of entity actors currently active in the game world:
- **World Status Summary**: Shows current server tick time, average FPS, and in-game day/night cycle time.
- **Entity Categorization**: Filter by **Pals**, **Bosses**, **Rare/Lucky Pals**, or **Guilds**.
- **Actor Metadata**: Inspect Level, Current HP / Max HP, AI Action states, Guild membership, and exact world coordinates.

---

### 🛠️ Diagnostics Tab
System health checks and raw data inspection for server operators:
- **Server Health Audit**: Automated verification of latency, telemetry payload integrity, and REST API connectivity.
- **Snapshot Viewer**: Expandable tree view of the raw JSON snapshot payload returned by the Rust backend.
- **Unit Test Runner**: Run built-in client-side diagnostic suite directly inside the desktop app.

---

### ⚙️ Settings Tab
Manage session state, refresh intervals, and credentials:
- **Telemetry Poller Interval**: Adjust background polling rate (Default: 3 seconds).
- **Disconnect / Forget Server**: Clears stored connection parameters and deletes credentials from Windows Credential Manager.

---

## 4. Server Management & Admin Tools

Header controls and modal dialogs provide rapid administrative capabilities:

| Action | Control Button Location | Description |
| :--- | :--- | :--- |
| **Broadcast Announcement** | Header / Titlebar | Sends an in-game banner message to all online players. |
| **Save World State** | Server Controls Modal | Triggers an immediate server-side world save (`/v1/api/save`). |
| **Graceful Shutdown** | Server Controls Modal | Schedules a server shutdown after a specified delay (seconds) with an in-game alert message. |
| **Emergency Stop** | Server Controls Modal | Immediately terminates the server process. |
| **View Ban List** | Server Controls Modal / Players Tab | Inspect active server bans and unban players with a single click. |

---

## 5. Troubleshooting Common Connection Issues

| Error Message / Code | Probable Cause | Recommended Action |
| :--- | :--- | :--- |
| **Authentication Failed (HTTP 401)** | Incorrect `AdminPassword` or username | Verify `AdminPassword` in `PalWorldSettings.ini`. Ensure username is set to `admin`. |
| **Connection Timeout** | Palworld server down or port blocked | Verify `RESTAPIEnabled=True`. Ensure Windows Firewall allows TCP traffic on port `8212`. |
| **Malformed Response Payload** | Connected to wrong port | Ensure URL uses REST API port (`8212`), not game client UDP port (`8211`). |
| **Palworld Server Unavailable** | Wrong IP/Hostname or HTTP scheme | Double-check host IP, port number, and ensure URL includes `http://` or `https://`. |
