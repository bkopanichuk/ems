# PRD — Power Arbitrage Service (Export to Grid)

## 0) Summary
The service fetches day-ahead DAM prices daily, optimizes an hourly charge/discharge plan to **sell to the grid**, writes the plan to client inverters over HTTP/TCP, ingests telemetry, and provides analytics.  
Backend: **Node.js**. Frontend: **Vue 3 (Nuxt) + shadcn-vue**. Deployment: **cloud**.

---

## 1) Personas & Roles
- **User (Client)**  
  Has login/password. Manages their inverters (no limit), per-device strategy, **min SoC**, enable/disable the service, views telemetry and stats.
- **Admin (System Owner)**  
  Single account; login/password set via **env**. Creates/blocks users. Can **impersonate** any user (view UI as that user).

*(No other roles in MVP.)*

---

## 2) Goal & KPIs
- **Goal:** maximize profit from exporting electricity to the grid.

**KPIs**
- Nightly schedule application success rate: **100%**.
- Nightly update deadline: **≤ 30 min after 00:00 Europe/Kyiv**.
- MTTR for schedule/connection failure: **≤ 10 min**.
- Optimization time per device: **≤ 30 s** (when external optimizer is available).

---

## 3) Scope & Constraints
- **Export-only.** Import is allowed only as cheap energy for later export.
- No hard cycle limits — only physical limits of inverter/BESS.
- **24-hour schedule** written daily; daytime re-opt + delta updates allowed.
- **Hourly granularity** for prices and plan (0..23).
- Price source:  
  `https://www.oree.com.ua/index.php/PXS/get_pxs_hdata/DD.MM.YYYY/DAM/2` (payload is noisy; numeric values must be parsed).
- UI timezone: **Europe/Kyiv**. Storage: **UTC**.
- Inverter connectivity: **HTTP/TCP** at user-provided host/port.
- Inverter model selected by user from a supported catalog.

---

## 4) User Flows (MVP)

### 4.1 Admin
- Log into web UI.
- Open **User Management** tab.
- Create user (email/login, temporary password, status).
- Block/unblock users.
- Open **Service Metrics** tab; view logs/metrics (health, price ingest lag, job queues).
- Use top-bar **user selector** to impersonate a client (UI mirrors the Client role).

### 4.2 User
- Log in (credentials provided by Admin).
- Add inverter: name, **model**, host/IP, port, protocol (HTTP/TCP), credentials/key, **capacity (kWh)**, **P_charge_max**, **P_discharge_max**, **min SoC (%)**.
- **Enable** the service (toggle).
- Choose device strategy:
  - **Max Profit**
  - **Balanced** (profit − λ·throughput; λ is system-wide for MVP, adjustable later)
- View today/tomorrow plan, actuals, SoC, power, profit/day and profit/month.
- View command/schedule/error log per device.

---

## 5) Functional Requirements

### 5.1 Price Ingest (FR-P)
- **FR-P1:** At **00:00 Europe/Kyiv**, fetch DAM prices for date **D (today)**.
- **FR-P2:** Parse source response and persist **24 prices (0..23)** with source/timestamp metadata.
- **FR-P3:** Retries on failure (≥3, exponential backoff).
- **FR-P4:** Validation: exactly 24 numeric values; monotonicity not required.
- **FR-P5:** On source outage — **fallback** to last valid prices with **stale** flag + system log entry.
- **FR-P6:** Manual re-ingest trigger available in Admin UI.
- **FR-P7:** Keep historical prices for analytics/audit.

### 5.2 Optimization (FR-O)
- **FR-O1:** After successful ingest, create an “optimize day D” job per **enabled** inverter.
- **FR-O2:** Optimizer inputs per device: `prices[24]`, `SoC0`, `capacity(kWh)`, `P_charge_max`, `P_discharge_max`, `efficiency`, grid constraints (export/import), `strategy`, `minSoC`, optional `PV_forecast[24]`.
- **FR-O3 Strategies:**
  - **Max Profit:** maximize export margin with efficiency/constraints.
  - **Balanced:** maximize margin − **λ·throughput** (degradation proxy). λ is system config.
- **FR-O4:** Output: `power[24]` (− charge, + discharge), expected profit, warnings (e.g., “limited by min SoC”, “insufficient power for requested profile”).
- **FR-O5:** Constraints: `SoC ∈ [minSoC, 100%]`, SoC dynamics include efficiency; `|P|` within device limits; **no simultaneous charge & discharge**.
- **FR-O6:** Optimization time per device **≤ 30 s**; on timeout → mark job `timeout` and retry later.
- **FR-O7:** Re-optimization can be triggered manually or by system triggers (see 5.6).

### 5.3 Schedule Application (FR-S)
- **FR-S1:** After optimization, create a “write schedule for D” job.
- **FR-S2:** Apply via device driver (HTTP/TCP). **Read-back is mandatory** (verify written = planned).
- **FR-S3:** Idempotent writes: repeating plan writes must not corrupt state.
- **FR-S4:** On comms error — ≥3 retries; on failure → `Failed` + error logged.
- **FR-S5:** Daytime **delta updates** for a subset of hours without wiping the rest.
- **FR-S6:** DST days (23/25h) handled correctly per model’s behavior.

### 5.4 Telemetry (FR-T)
- **FR-T1:** Collect per device: SoC, `P_charge`/`P_discharge`, `P_grid`/`P_pv`/`P_load` (if available), volt/amp, temps, alarms/status, schedule version.
- **FR-T2:** Target frequency **1 min** (configurable; default **5 min**).
- **FR-T3:** Store in time-series DB with de-dup by `(deviceId, timestamp)`.
- **FR-T4:** If no telemetry for **N** minutes → “silence” event; log + device status `Degraded`.
- **FR-T5:** Online retention **12–24 months** + archive.

### 5.5 Web Interface (FR-W)
- **FR-W1 Admin panel:**
  - Users list (create, block/unblock, reset password).
  - **User selector** for impersonation (view UI as the selected client).
  - System logs/metrics (health, queue sizes, ingest latency).
- **FR-W2 User pages:**
  - **Dashboard:** service status per device, plan (today/tomorrow), actuals, SoC, power, profit (day/month), error indicators.
  - **Device:** model, host, port, protocol; **service toggle**; strategy (**max profit / balanced**); **min SoC**; optional PV forecast source; command/error log.
  - **History:** charts: plan vs actual, SoC, prices, profit by period; CSV export.
- **FR-W3:** All times shown in user locale; timezone/DST displayed.

### 5.6 System Triggers & Modes (FR-SYS)
- **FR-SYS1:** Nightly pipeline: **00:00** price ingest → optimization for all active devices → schedule application for all plans.
- **FR-SYS2:** Daytime re-opt can be started by Admin/User (per device) or auto-triggered by:
  - Changing user parameters (min SoC, strategy, enable/disable).
  - Device connection restored after downtime.
  - Adding/updating PV forecast.

---

## 6) Non-Functional Requirements

### 6.1 Performance & Reliability
- Critical nightly deadline: **all active devices updated ≤ 30 min after 00:00**.
- Job queues with retries (exponential backoff, DLQ).
- Horizontal scaling of optimization/application workers.

### 6.2 Security
- Multi-tenant RBAC: `admin`, `user`.
- Auth: login/password; **JWT** for APIs.
- Encryption in transit (**TLS**) and at rest (**KMS**).
- Secrets (device credentials) stored in a secret manager.

### 6.3 Audit & Logs
- Full audit trail: who/when changed device params/strategy/min SoC/service toggle.
- Event streams: price ingest, optimization, schedule writes, telemetry silence, driver errors.
- Log export (JSON/CSV).

---

## 9) Web UI: Screens & Elements

### 9.1 Admin
- **Users:** table, create, block, reset password.
- **User selector** (impersonation).
- **System logs/metrics:** pipeline latency, DLQ size, ingest latency, uptime.  
  Overall UI mirrors the User view with extra admin menu items.

### 9.2 User
- **Dashboard:** aggregate metrics across all devices.
- **Devices menu:** select a device to view detailed metrics and edit parameters.

---

## 12) Edge Cases
- **DST (23/25h):** prices/plan normalized to 24 slots via system mapping; application honors model-specific behavior.
- **Price source unavailable:** mark **stale**; permit one cycle on previous prices; mandatory log.
- **Device offline:** mark `Offline`; schedule jobs retried/DLQ; UI shows cause.
- **Model/firmware incompatibility:** driver returns capability error; device marked `Degraded`; manual action required.
- **Wrong local time on device:** driver must set time or compensate offset during write if supported; otherwise warn in logs.
- **Partial telemetry:** profit calculations ignore missing intervals or mark them low-quality.
