# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.38.0] - 2026-10-09

### Added
- **Stock-Flow Outbound Webhook on Claim Close (Integration Plan Phase 2) (`src/lib/webhooks/stockFlowWebhook.ts`, `src/app/api/tickets/route.ts`, `TicketDetailView.tsx`, `database.ts`, `useTicketsQuery.ts`)**:
  - New server-side dispatcher `dispatchStockFlowWebhook` posts `claim.closed` events to `STOCKFLOW_WEBHOOK_URL` (default `https://stockflowth.online/api/caim-webhook`) with an HMAC-SHA256 signature header `x-caim-signature: sha256=<hex of the raw JSON body + `CAIM_WEBHOOK_SECRET`>`, `x-caim-timestamp` (unix seconds) and `x-caim-event-id` (deterministic idempotency key `<ticketId>:<repairResult>:<serial>`).
  - Dispatch runs from Next.js `after()` so a Stock-Flow outage can never block or fail a CAIM case update; 8s timeout with 1 retry on transient failure (5xx/429/network), failures logged with the event id.
  - Trigger fires exactly on the close transition (`statusCode === 5` / `"ปิดเคส"`), and also when an already-closed case has its repair result changed; the previous record is read before the update so repeated saves do not re-send the same stock movement.
  - New structured `repairOutcome` field (`unrepairable` | `repaired` | `replaced_new`) plus `replacedNewSerialNo`, `disposalMethod`, `closedAt`, `closedBy` on the ticket document. When `repairOutcome` is absent the free-text `repairResult` is keyword-mapped (unrepairable is matched first so stock is never inflated); ambiguous text is skipped and logged instead of guessed.
  - Close-status modal now requires the repair outcome (and the new S/N when `replaced_new` is selected) before the case can be closed, and the result is persisted through `PUT /api/tickets`.
  - `.env.example` documents `CAIM_WEBHOOK_SECRET` and `STOCKFLOW_WEBHOOK_URL`.

## [0.37.1] - 2026-10-02

### Fixed
- **Mobile Sidebar Drawer Navigation Labels & User Profile Restoration (`AppShell.tsx`)**:
  - Restored menu item text labels and user profile details inside the mobile drawer viewport (< 768px).
  - Resolved responsive class conflicts where desktop collapsed mode (`sidebarOpen === false`) was hiding labels and titles on mobile drawer opens (`mobileMenuOpen === true`).
  - Switched from conditional DOM unmounting to responsive CSS utilities (`inline md:hidden`, `block md:hidden`, `flex md:hidden`), ensuring full text labels render side-by-side with icons in mobile drawer mode (`w-72` / 280px) while maintaining compact icon-only mode (`md:w-16`) on desktop.
  - Standardized navigation row layout and styling to `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors`.
  - Restored footer user profile card displaying the 'PC' avatar badge, user name fallback (`เจ้าหน้าที่ปฏิบัติการ`), and operational role (`เจ้าหน้าที่บริหารงานเคลม`).
  - Synchronized documentation label to 'คู่มือการใช้งาน' (`BookOpen` icon) and updated context header title.

## [0.37.0] - 2026-10-02

### Purged & Cleaned (Production Transition)
- **Repository Purge & Cloner Tooling Elimination**:
  - Permanently deleted web scraping tools, asset downloaders, and cloner scripts (`scripts/download-assets-equipment-claims-3ec6aa15-root-8a5edab2.mjs`, `scripts/test_insert.mjs`).
  - Purged `.agents/skills/clone-website/` workflow and `.claude/commands/clone-website.md` cloner bridge.
  - Purged raw inspection output, scraped HTML/topology dumps, and design comparison snapshots (`docs/research/`, `docs/design-references/`, `docs/assets/`).
  - Purged raw unreferenced cloned images and dumps from `public/sites/` (5.36MB `IMG_8154_enhanced_2x.png`), `public/images/`, and root temporary video/excel files (`gemini_generated_video_d9f63be0.mp4`, `20260907-add-total.xlsx`, `บัญชีรายชื่อ.xlsx`).
  - Updated `.gitignore` to prevent tracking of scraping caches, raw XLSX dumps, and cloner staging directories.
  - Updated `package.json` and `AGENTS.md` to establish official production identity as **CAIM - Telecommunication Equipment Claims & RMA Tracking System for Forth Corporation**.

## [0.36.1] - 2026-10-02

### Changed & Refactored
- **Free-Text Input Transition for 'ผู้เกี่ยวข้อง' Section (`ClaimStakeholdersSection.tsx`)**:
  - Converted 'ผู้แจ้ง / เจ้าของเครื่อง' (`reporterName`) and 'ผู้รับผิดชอบเคส' (`assigneeName`) to standard free-form text inputs (`<input type="text" />`).
  - Removed `<select>` dropdown controls, chevron indicator arrows, and hardcoded mock choice lists (`PRESET_ASSIGNEES`, `REPORTER_SUGGESTIONS`, `<datalist>`), allowing full manual name entry.
  - Configured clear placeholder text:
    - Reporter: `"ระบุชื่อผู้แจ้ง หรือเจ้าของเครื่อง..."`
    - Assignee: `"ระบุชื่อผู้รับผิดชอบเคส หรือทีมช่าง..."`
  - Preserved dark glassmorphism input styling (`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm`) and reactive string state bindings.

## [0.36.0] - 2026-10-02

### Added & Enhanced
- **New 'ผู้เกี่ยวข้อง' (Stakeholders & Personnel) Form Section & Dark Glassmorphism Integration (`NewTicketView.tsx`, `ClaimStakeholdersSection.tsx`, `claimSchema.ts`, `/api/claims/route.ts`, `database.ts`, `recordStorage.ts`)**:
  - **Adapted Glassmorphism UI Component (`ClaimStakeholdersSection.tsx`)**: Created a dedicated form section card with `bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl` matching the portal's high-tech dark theme.
  - **Responsive Layout & Visual Tokens**:
    - **Top Row (2 Columns)**:
      - 'ผู้แจ้ง / เจ้าของเครื่อง' (`reporterName`): Text input with autocomplete suggestions (`<datalist>`) for station heads and field staff.
      - 'ผู้รับผิดชอบเคส' (`assigneeName`): Dropdown with quick-select options for support tiers and repair specialists, with one-click switch to custom entry mode.
    - **Bottom Row (Full Width)**:
      - 'หมายเหตุ' (`remarks`): Multi-line textarea (`rows={3}`) for handover details, special repair precautions, and emergency contact notes.
    - **Aesthetic Compliance**: Clean inputs styled with `bg-slate-950/60 border border-slate-700/60 text-slate-100 placeholder-slate-500 focus:ring-blue-500/40 focus:border-blue-500`, prefixed with Lucide `Users` multi-user icon.
  - **Zod Validation Schema (`claimSchema.ts`)**: Implemented `claimFormSchema` and `claimPayloadSchema` for client-side form validation and server-side request verification.
  - **REST API Route & Payload Dispatch (`/api/claims`)**: Created dedicated REST endpoint `POST /api/claims` (along with `GET`, `PUT`, `DELETE`) with Zod payload validation and dual persistence (MongoDB + local disk store).
  - **Form State Integration (`NewTicketView.tsx`)**: Bound all three fields to state, integrated Zod validation before submission, and dispatched the full payload to `POST /api/claims`.

## [0.35.0] - 2026-10-01

### Added & Enhanced
- **Dynamic SLA Window Framework & Inline Date Editing for Permits (`OverseasView.tsx`, `permitSla.ts`, `/api/rma/permit/route.ts`, `/api/permits/[id]/route.ts`)**:
  - **Inline & Drawer Date Editing Controls**: Added an edit trigger button (Pencil icon) on each permit card in both the Overseas Drawer view and the Permits Tab, unlocking inline date pickers styled for the dark theme canvas.
  - **Dynamic SLA Window (Unbound from Hardcoded 90 Days)**: Removed hardcoded 90-day assumptions, dynamically deriving `totalSlaDays = differenceInCalendarDays(expirationDate, issueDate)`. The SLA subtext dynamically adjusts to `กรอบเวลา SLA {totalSlaDays} วัน (ผ่านไป {elapsedDays} วัน)` with progress bar fill proportional to `(elapsedDays / totalSlaDays) * 100`.
  - **Real-Time Recalculation & Quick Presets**: Integrated real-time recalculation of SLA metrics and added quick preset pills (`+30 วัน`, `+60 วัน`, `+90 วัน`, `+120 วัน`, `+180 วัน`) for instant validity adjustments.
  - **REST PATCH Persistence & Optimistic Sync**: Added `PATCH /api/rma/permit` and `PATCH /api/permits/:id` endpoints, persisting new dates, total SLA days, and status to MongoDB and disk storage, while optimistically updating cache and timeline views without page reload.

## [0.34.3] - 2026-10-01

### Fixed & Enhanced
- **Dynamic 90-Day Permit SLA Calculation Recalibration & Data Reconciliation (`permitSla.ts`, `OverseasView.tsx`, `/api/rma/permit/route.ts`, `database.ts`, `scripts/reconcile_permits.js`)**:
  - **Dynamic Expiration & Calendar Days Math**: Implemented strict mathematical functions `expirationDate = addDays(new Date(issueDate), 90)`, `elapsedDays = differenceInCalendarDays(currentDate, issueDate)`, `remainingDays = Math.max(0, differenceInCalendarDays(expirationDate, currentDate))`, and `progressPct = Math.min(100, Math.max(0, (elapsedDays / 90) * 100))`.
  - **Card Widgets Display Parity**: Standardized permit card widgets across the Permits Tab and Drawer view to enforce display parity:
    - Primary pill: `เหลืออีก {remainingDays} วัน` (e.g. `เหลืออีก 56 วัน` or `เหลืออีก 19 วัน`)
    - Subtext: `กรอบเวลา SLA 90 วัน (ผ่านไป {elapsedDays} วัน)`
    - Progress bar: `Math.min(100, Math.max(0, (elapsedDays / 90) * 100))`
  - **Real-Time DatePicker Reactivity in Modal**: Re-wired `issueDate` input in permit creation dialog to dynamically calculate and bind `expiryDate: calculatePermitExpirationDate(newDate, 90)` with an instant live SLA preview banner, eliminating date freezing.
  - **Data Migration & Reconciliation**: Executed automated reconciliation audit (`scripts/reconcile_permits.js`) across MongoDB `rma`, `transaction_logs`, and disk `src/data/rma.json`, repairing legacy discrepancies (such as 180-day and 29-day records) into strict 90-day validity records.

## [0.34.2] - 2026-10-01

### Fixed & Enhanced
- **Multi-Permit Stepper Coverage & MongoDB Case Resolution (`api/rma/permit/route.ts`, `OverseasView.tsx`, `StageProgressBarCell.tsx`)**:
  - **Resolved Missing Import Permit Issue**: Diagnosed why user-submitted import permit `E05036903929` and export permit `E05046900335` did not bind to MongoDB case `TL20260708` — `/api/rma/permit` was resolving target RMA exclusively against disk JSON instead of MongoDB collection, falling back to disk ID `"1"`.
  - **MongoDB First Target Resolution**: Updated `/api/rma/permit/route.ts` to query active MongoDB collection first by `rmaNo` / `id` / `serialNo`, correctly binding updates to live database documents.
  - **Multi-Permit Visual Stepper Coverage**: Enhanced Stepper rendering to support multiple concurrent permits on the same RMA (e.g. Export `E05046900335` covering steps 1–5 AND Import `E05036903929` covering steps 5–8) with individual attached pills, glowing borders, and stage badges.
  - **RMA Table & Progress Bar Multi-Chip**: Updated RMA table and progress bar cells to display chips for both export and import permits simultaneously.
  - **Bound User Permits**: Successfully attached both user-created permits `E05036903929` (นำเข้า) and `E05046900335` (ส่งออก) to case `TL20260708` in MongoDB.

## [0.34.1] - 2026-10-01

### Fixed & Enhanced
- **Timeline Stepper Permitted Coverage Visibility & Empty CTA Banner (`OverseasView.tsx`, `rma.json`)**:
  - Bound sample permit `EXP-2026-0089` (ส่งออกเพื่อซ่อมแซม, กสทช., ขั้นตอน 1–5) to live MongoDB case `TL20260708` and `TEST20` in `src/data/rma.json`.
  - Added empty-state CTA banner `[เคสนี้ยังไม่มีใบอนุญาตนำเข้า-ส่งออกผูกอยู่] [+ ออกใบอนุญาตสำหรับเคสนี้]` at the top of the Timeline tab when an RMA has no permit bound yet.
  - Enhanced inline stage badge text to explicitly show permit type and remaining days on every covered step node.
  - Added immediate state synchronization `setTimelineItem(data.linkedRma)` in `handleCreateImportExportPermit` so active timeline modals refresh instantly upon permit submission.

## [0.34.0] - 2026-10-01

### Fixed & Enhanced
- **Form Submission Persistence Pipeline & Visual Coverage Linkage (`OverseasView.tsx`, `/api/rma/permit/route.ts`, `database.ts`, `rmaDuration.ts`, `StageProgressBarCell.tsx`)**:
  - **Audit & Fix Form Submission & Data Persistence Pipeline**:
    - Fixed `/api/rma/permit/route.ts` payload processing to accept and persist all active fields (`permitNo`, normalized `permitType`, `authority`, `destinationCountry`, `rmaId`, `rmaNo`, `serialNo`, `issueDate`, `expiryDate`, `coveredSteps`, `coveredStages`, `remarks`).
    - Added atomic persistence to local JSON file store (`data/rma.json`) and MongoDB with transaction logging and SSE cache invalidation (`RMA_CHANGED`).
    - Fixed `handleCreateImportExportPermit` in `OverseasView.tsx` with error handling, active mutation via `applyRmaMutation("update", data.linkedRma)`, and cache invalidation via `invalidateRmaCache()`.
    - Real-time toast feedback on save: success toast (`"บันทึกใบอนุญาตนำเข้า-ส่งออกสำเร็จ"`), modal auto-close, and descriptive error toasts on missing required fields or network failure.
  - **Visual Coverage in Timeline & Stepper**:
    - Highlighting of covered step nodes (Steps 1–5 or 5–8) with glowing cyan borders (`border-cyan-400`), cyan tint background (`bg-cyan-50/50 dark:bg-cyan-950/20`), and glowing step node ring (`ring-2 ring-cyan-400`).
    - Rendered attached permit pill above covered step range: `[🛡️ ใบอนุญาต: EXP-2026-XXXX | คุ้มครองขั้นตอน 1-5 | เหลือ XX วัน]`.
  - **Surface Saved Permits in RMA Table & Dedicated Detail Drawer**:
    - Added explicit permit chip badges in the main RMA table row (`ใบอนุญาตส่งออก: EXP-2026-XXXX` / `ใบอนุญาตนำเข้า: IMP-2026-XXXX`) under the RMA number and in `StageProgressBarCell`.
    - Added dedicated "ใบอนุญาตขนส่ง (Permits)" sub-panel and tab switcher inside the RMA detail drawer displaying complete permit records, 90-day SLA progress bar, permit details grid, and audit log.

## [0.33.0] - 2026-10-01

### Added
- **Conditional Lifecycle Tracking & 90-Day Permit SLA Timeline Trigger (`OverseasView.tsx`, `permitSla.ts`, `/api/rma/permit`)**:
  - **Conditional Step-Coverage & Tracking Scope**:
    - **Case 1 ('ส่งออกเพื่อซ่อมแซม' / Export for Repair)**: Automatically binds and activates coverage across Steps 1 through 5 in the Overseas Claim timeline (เปิดใบ RMA → Forth ตรวจสอบ → กสทช. อนุมัติ → ส่งออก → ถึงศูนย์ต่างประเทศ).
    - **Case 2 ('นำเข้าหลังการซ่อมแซม' / Import after Repair)**: Automatically binds and activates coverage across Steps 5 through 8 in the Overseas Claim timeline (ถึงศูนย์ต่างประเทศ → กระบวนการซ่อมแซม → ส่งกลับเครื่องบิน → ศุลกากรขาเข้า).
  - **90-Day Permit Validity & Deadline Calculation Utility (`permitSla.ts`)**:
    - Enforced strict 90-day SLA window with automatic expiration calculation (`expiryDate = issueDate + 90 days`).
    - Dynamic calculation of elapsed days vs. remaining days within the SLA window, flagging warning status when 15 days or fewer remain.
    - Added reactive date-picker calculation in permit modal auto-filling expiration date and showing SLA window helper.
  - **Backend Permit Submission Handler (`/api/rma/permit/route.ts`)**:
    - Created dedicated API route accepting permit creation/linking requests, attaching permit metadata and step coverage to target RMA records.
    - Persists permit records to disk (`rma.json`) and MongoDB with transaction logging and real-time event broadcasting (`RMA_CHANGED`).
  - **UI Timeline Step Indicator & Overview Banner (`OverseasView.tsx`)**:
    - Injected compact badges beside covered steps in the Overseas Claim Timeline modal: `[ใบอนุญาต: EXP-2026-XXXX | เหลืออีก XX วัน]` with warning/expired badges.
    - Added Active Permit SLA Summary banner with visual progress bar at the top of the timeline tracking modal.

## [0.32.0] - 2026-10-01

### Added
- **New Import/Export Permit Action Button & Interactive Creation Modal (`OverseasView.tsx`)**:
  - **Header Toolbar Action Button ('เปิดใบนำเข้า-ส่งออก')**:
    - Inserted adjacent and immediately to the left of the existing '+ เปิดใบส่งซ่อม' button in the page toolbar.
    - Designed with dark enterprise styling: slate-800 background, border border-slate-700/80, hover elevation, subtle active scale press (`active:scale-[0.98]`), and cyan accent `ArrowLeftRight` icon prefix.
    - Wrapped both action buttons inside a responsive container (`flex flex-wrap sm:flex-nowrap items-center gap-2.5 self-start sm:self-auto`) guaranteeing graceful stacking on mobile viewports without breaking page title alignment.
  - **Interactive Import/Export Permit Modal Dialog (`isImportExportModalOpen`)**:
    - Built comprehensive dialog for telecommunications repair customs and regulatory approvals (กสทช. NBTC / กรมศุลกากร Customs).
    - Features fields for Permit/Application number (with automatic number generator), permit classification type (Export for Repair, Import after Repair, NBTC Permit, Customs Clearance), regulatory authority selector, destination/origin country, RMA linking, equipment selection, issue/expiry dates, and notes.
    - Integrated with animated toast notification and responsive modal dismiss handling.

## [0.31.0] - 2026-10-01

### Added
- **Full Responsive Application Layout & Touch Ergonomics Revamp across Viewports**:
  - **Adaptive Navigation & Mobile Sheet Drawer (`AppShell.tsx`, `LanguageSwitcher.tsx`)**:
    - Mobile (< 768px): Collapsed fixed desktop sidebar into an accessible slide-over sheet drawer with darkened backdrop blur (`bg-black/60 backdrop-blur-sm`).
    - Tablet (768px - 1023px): Implemented viewport auto-detection defaulting to an icon-only collapsed sidebar (`w-16`) to maximize table and chart display area without horizontal page-level overflow.
    - Touch Targets: Upgraded all header controls, theme toggles, hamburger buttons, and language switcher to meet WCAG touch target guidelines (minimum 44x44px touch area with `touch-manipulation`).
  - **Dynamic Multi-Column Dashboard & Metric Cards (`DashboardView.tsx`)**:
    - Reconfigured summary KPI cards and performance indicators to responsive grids (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
    - Weekly overview summary boxes stack on small viewports (`grid-cols-1 sm:grid-cols-3`) to prevent number clipping.
  - **Data Tables Horizontal Overflow & Sticky Columns Management (`TicketsView.tsx`, `OverseasView.tsx`, `AssetsView.tsx`, `StationsView.tsx`, `TableActionCell.tsx`, `globals.css`)**:
    - Wrapped all four data tables with `overflow-x-auto scrollbar-subtle` using custom CSS thin scrollbars.
    - Pinned critical key columns on horizontal swipe: sticky left index/checkbox and sticky right action buttons (`sticky left-0` and `sticky right-0` with boundary box-shadows).
    - Added string truncation (`truncate`) with full hover/touch tooltips on serial numbers, equipment models, station locations, and problem descriptions.
    - Increased touch targets on table row action triggers (View, Edit, Delete, Copy) for smooth touch interaction.

## [0.30.2] - 2026-10-01

### Removed
- **Real-time Sync Pill Badge Removal across Target Modules (`TicketsView.tsx`, `OverseasView.tsx`, `AssetsView.tsx`, `StationsView.tsx`)**:
  - Removed visual 'ซิงก์เรียลไทม์' (Real-time Sync) pill indicator badge (Wi-Fi icon and text capsule) from the headers and toolbars across 4 pages:
    - 'รายการเคลม' (Claim List / Claims - `TicketsView.tsx`)
    - 'ส่งเคลมต่างประเทศ' (Overseas Claim - `OverseasView.tsx`)
    - 'ข้อมูลอุปกรณ์' (Equipment Information - `AssetsView.tsx`)
    - 'ข้อมูลสถานี' (Station Information - `StationsView.tsx`)
  - Preserved flex/grid layout alignment, spacing, and height of adjacent controls (search inputs, action buttons, export buttons, and headings).
  - Maintained complete integrity of underlying background data synchronization and event subscriptions (`useRealtimeSync`) without disruption to active table mutation listeners.

## [0.30.1] - 2026-10-01

### Changed
- **Process Claim Custom Brand Favicon Assets & Metadata (`layout.tsx`, `public/`, `src/app/`)**:
  - Replaced the default Vercel template triangle favicon with the custom Process Claim blue rounded-square 'P' logo mark.
  - Generated multi-format, multi-resolution brand icon assets:
    - `favicon.ico` (multi-resolution 16x16, 32x32, 48x48)
    - `icon.png` (192x192), `favicon-32x32.png`, `favicon-16x16.png`
    - `apple-touch-icon.png` (180x180)
    - `icon.svg` (scalable vector format)
  - Placed assets in both `public/` and `src/app/` static directories to prevent host template fallbacks.
  - Configured Next.js App Router root `metadata.icons` and explicit HTML `<head>` link tags with cache-busting query parameter (`?v=2`) to guarantee immediate browser rendering without cached icon retention.

## [0.30.0] - 2026-10-01

### Added
- **Interactive Global Multi-Language Switcher & Reactive i18n Engine**:
  - **LanguageSwitcher Dropdown (`LanguageSwitcher.tsx`)**:
    - Trigger button positioned at the top-right corner of the global navigation bar next to the theme toggle.
    - Designed with Lucide `Globe` icon and active locale code ('TH' or 'EN') in a dark-themed rounded container (`px-2.5 py-1.5 rounded-lg border border-slate-700/60 bg-slate-900/80 text-slate-200 hover:bg-slate-800 transition-colors`).
    - Modern dark glassmorphic floating dropdown (`bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-xl p-1.5 space-y-1`) with animated fade/zoom in.
    - Option list with custom language badges ('TH' / 'EN'), localized labels ('ไทย' / 'English'), and glowing active indicator dot with check icon.
    - Click-outside and Escape key dismissal for intuitive UX.
  - **Reactive Localization Provider (`LocaleContext.tsx`, `types.ts`)**:
    - Dedicated `LocaleProvider` context that globally synchronizes language state across all routes, layouts, and components.
    - Type-safe dictionary access and deep nested key translation helper `t(key, fallback)`.
    - Instant, flicker-free client state re-rendering without requiring full browser reload.
    - Dual persistence in `localStorage` and `locale` cookie for seamless session survival.
    - Synchronizes `document.documentElement.lang` dynamically.
  - **Modular Translation Dictionaries (`th.json`, `en.json`)**:
    - Navigation & Sidebar menus (Dashboard, Claims List, New Claim, Overseas Claim, Equipment Info, Station Info, System Manual).
    - Dashboard metric cards, KPI titles, and live sync status indicators.
    - Data table column headers (No., Serial Number, Case, Equipment, Status, Reported Date, Age, Actions).
    - Landing page hero titles, subtext, and CTA buttons.

## [0.29.7] - 2026-10-01

### Changed
- **Top Navigation Bar & Dashboard Status Indicator Refactor (`AppShell.tsx`, `DashboardView.tsx`)**:
  - **Removed Top-Right Status Badge (`AppShell.tsx`)**: Completely removed the redundant `"ระบบออนไลน์"` pill container (green dot, text, and border capsule) next to the theme toggle button in the top navigation bar.
  - **Standalone Animated Pulsing Indicator (`DashboardView.tsx`)**: Stripped the text string `"ระบบออนไลน์"` and removed the outer pill border container wrapper next to the `"ภาพรวมงานเคลมอุปกรณ์"` heading. Retained a sleek standalone pulsing green dot indicator with subtle ping and glow animations (`h-2.5 w-2.5` with outer `animate-ping` and inner `bg-emerald-500 shadow-[0_0_8px_#10b981]`).
  - **Accessible Tooltip & Hover Title**: Retained accessible context with `title="ระบบออนไลน์"`, `role="status"`, and `aria-label="ระบบออนไลน์"`.

## [0.29.6] - 2026-10-01

### Changed
- **Dashboard Header Controls & Status Indicator Refactor (`DashboardView.tsx`)**:
  - **Relocated Online Status Badge**: Moved the green connection status indicator dot/pill (`ระบบออนไลน์`) from the far right over to the dashboard title section, placing it inline immediately after `"ภาพรวมงานเคลมอุปกรณ์"` styled with a compact glowing green badge (`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20`).
  - **Cleaned Redundant Timestamps**: Removed the redundant text/timestamp block (`ซิงก์สดอัตโนมัติ | 10:39:38`) previously nested between the indicator and the refresh button, preserving telemetry timestamps in native hover titles.
  - **Restored Refresh Button Label**: Transformed the top-right refresh trigger from an icon-only button into a combined button with the Thai label `"รีเฟรชข้อมูล"` and modern enterprise dark-theme button aesthetics (`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 transition-all active:scale-95`).
  - **Animated Active Refresh**: Ensured smooth `animate-spin` rotation on the refresh icon while data fetching is active.

## [0.29.5] - 2026-10-01

### Added
- **Icon-Only Table Row Action Buttons with Interactive Tooltips (`TableActionCell.tsx`)**:
  - Replaced text labels ('ดู', 'แก้ไข', 'ลบ') in the claims table action column with standard, intuitive SVG Lucide React icon triggers:
    - **ดู (View / Details)**: `Eye` icon styled in blue accents (`text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10`).
    - **แก้ไข (Edit)**: `Pencil` icon styled in neutral slate tones (`text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50`).
    - **ลบ (Delete)**: `Trash2` icon with removed text label, styled in rose accents (`text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10`).
  - Added uniform button sizing (`p-1.5 rounded-lg active:scale-95 transition-colors`) for a balanced layout.
  - Implemented modern dark enterprise hover tooltips (`px-2 py-1 text-xs font-medium rounded-md shadow-lg bg-slate-900 text-slate-100 border border-slate-700/60 pointer-events-none`) displaying descriptive Thai labels ('ดูรายละเอียด', 'แก้ไข', 'ลบ') floating above each button.
  - Added explicit screen reader accessibility attributes (`aria-label="ดูรายละเอียด"`, `aria-label="แก้ไข"`, `aria-label="ลบ"`, and `role="tooltip"`).

### Changed
- **Claims Management Table (`TicketsView.tsx`)**:
  - Integrated `<TableActionCell />` component into `TicketTableRow`, eliminating text clutters and streamlining table action interactions.

## [0.29.4] - 2026-10-01

### Added
- **Dynamic Current-Stage Duration Calculation Utility (`rmaDuration.ts`)**:
  - Implemented `calculateCurrentStageDuration`: Strictly computes elapsed days within the active ongoing step itself (`currentDate - currentStepStartedAt`), completely isolated from cumulative total case age or durations from prior steps.
  - Added stage-transition reactivity: Automatically resets duration counter to day 0 upon transitioning to a new stage with the newly recorded entry timestamp.
  - Finalized/closed stage duration locking: For completed or returned cases, locks stage duration to the total elapsed days between stage entry and completion timestamps.
  - Re-exported `RMA_STAGES_CONFIG` and added `currentStageStartedAt` and `currentStageCompletedAt` database/type interfaces.
- **Dedicated Overseas Tracking Segmented Progress Bar (`StageProgressBarCell.tsx`)**:
  - Modular table cell component rendering segmented step pills (emerald for completed, blue for current ongoing, slate for pending).
  - Clean stage label (e.g., "จีน (เข้ากระบวนการซ่อม)") and localized subtext (e.g., "4 วัน") styled in `text-xs text-slate-400 font-medium mt-0.5`.

### Changed
- **Overseas Claim Tracking Table (`OverseasView.tsx`)**:
  - Replaced inline stage progress markup with `<StageProgressBarCell item={item} />`.
  - Updated stage transition workflow (`handleAdvanceStage` and `handleSaveRetroactive`) to record active entry timestamps and lock previous step durations upon advancement.
- **RMA Backend API & Data (`/api/rma`, `rma.json`)**:
  - Enriched API response with dynamic active stage wait days and stage timestamp persistence.

## [0.29.3] - 2026-09-29

### Added
- **Ambient Looping Telecommunications Video Background (`ProcessClaimPortalLanding.tsx`)**:
  - **HTML5 Responsive `<video>` Setup**: Integrated `portal-ambient-bg.mp4` with `autoPlay`, `loop`, `muted`, and `playsInline` attributes for seamless, silent background playback across all modern desktop and mobile browsers.
  - **Readability Protection & Dark Gradient Masking**: Placed multilayered dark gradient overlays (`bg-gradient-to-r from-[#070d18]/92 via-[#070d18]/78 to-[#0b1329]/88 backdrop-brightness-75`) plus top and bottom fade blends to maintain optimal typographic contrast for the centered hero text, gradient title, and CTA button.
  - **Performance, Poster Fallback & Accessibility**:
    - Configured static placeholder poster frame (`poster="/assets/portal-bg-poster.webp"`).
    - Added accessibility `prefers-reduced-motion` detection (both via `window.matchMedia` hook and CSS `motion-reduce:hidden`), gracefully falling back to a clean ambient gradient canvas without motion.

## [0.29.2] - 2026-09-29

### Removed
- **Landing Page Highlighted Widgets & Telemetry Card (`ProcessClaimPortalLanding.tsx`)**:
  - Completely removed the right-side floating telemetry widget card (`SHF Telemetry System`) and hardware network metrics.
  - Removed the top-right online status / version badge pill (`ระบบออนไลน์ • โครงข่าย SHF v0.29.1`) from the header.
  - Removed the bottom-right version pill tag and adjacent footer system labels.
- **Background Imagery Asset**:
  - Removed telecommunication infrastructure and city background image (`IMG_8154_enhanced_2x.webp`) and multilayered image maskings.

### Changed
- **Streamlined Dark Gradient Canvas & Refocused Hero Layout**:
  - Established a clean, deep slate/navy canvas (`#070d18`) with soft ambient radial glows (cyan, indigo, blue) and subtle dot grid mesh behind the hero typography.
  - Refocused and centered the hero section (`max-w-4xl`) with balanced typography, primary CTA trigger ("เข้าสู่ระบบงาน →"), and translucent feature badges.

## [0.29.1] - 2026-09-29

### Fixed
- **Canvas Background Inconsistency & Layout Height Clipping (`OverseasView.tsx`)**:
  - **Diagnosed Root Cause**: In `OverseasView.tsx`, the main content wrapper was styled with hardcoded `bg-slate-50/50` without a `dark:` variant, overlaying the dark `#0b0f19` canvas and producing a washed-out, lighter navy box that abruptly cut off horizontally when content ended.
  - **Canvas Background Inheritance**: Replaced `bg-slate-50/50 py-6` with `bg-transparent py-7`, matching all other primary views (`TicketsView`, `DashboardView`, `StationsView`, `AssetsView`) to cleanly inherit the root dark-ambient canvas without horizontal color breaks.
  - **Full Viewport Height Flex Expansion (`AppShell.tsx`)**: Updated the page content wrapper in `AppShell.tsx` to `flex-1 flex flex-col min-h-0`, ensuring child `<main className="flex-1">` containers stretch across 100% of the viewport height on all displays.
  - **Surface & Elevation Token Alignment**: Standardized dark mode tokens across Overseas Claim headers, action triggers, segmented progress bars, table rows, badges, pagination controls, and modal dialogs (`dark:text-white`, `dark:text-slate-200`, `dark:border-white/10`, `dark:bg-[#1e293b]`, `dark:bg-[#0f172a]`).

## [0.29.0] - 2026-09-29

### Removed
- **Decommissioned Legacy `/login` Route & Authentication UI**:
  - Deleted `/login` page route and its associated legacy `LoginForm.tsx` container.
  - Stripped out all displayed credential hints, account labels, and hardcoded User IDs/emails across the portal.
  - Added permanent redirect in `next.config.ts` routing `/login` directly to root (`/`).
  - Updated `AppShell.tsx` logout handler to navigate directly to root (`/`) rather than `/login`.

### Changed
- **Clean Root Landing Page (`/`)**:
  - Established the high-tech dark 'PROCESS CLAIM PORTAL' as the dedicated primary presentation landing page at root (`/`).
  - Removed all user profile pills and credential metadata from the hero landing screen for a clean, presentation-focused UI.
  - Configured one-click entry CTA ("เข้าสู่ระบบงาน →") to silently auto-initialize a default staff session in the background and navigate directly to `/dashboard`.

## [0.28.0] - 2026-09-29

### Added
- **High-Tech Dark Portal Landing Experience (`ProcessClaimPortalLanding.tsx`)**:
  - **Visual Composition & Background Atmosphere**: Crafted an immersive deep-navy dark canvas (`#070d18`) with subtle radial glow / ambient lighting behind primary typography and dark-tinted telecommunication infrastructure backdrop positioned on the right.
  - **Hero Typography & System Branding**:
    - Cyan/sky overline badge: `EQUIPMENT CLAIM OPERATIONS & TRACKING` with live pulsing indicator.
    - Prominent bold hero heading: "PROCESS" with purple/blue-to-cyan gradient text sheen + "CLAIM PORTAL" in bold white typography with subtle shadow.
    - Professional Thai summary paragraph introducing the unified radio network claims management system.
  - **Luminous Action Trigger & Highlight Pills**:
    - Primary CTA button "เข้าสู่ระบบงาน →" with electric blue gradient (`from-blue-600 to-indigo-600`), soft drop shadow glow (`shadow-lg shadow-blue-500/30`), smooth hover lift, and direct transition to `/dashboard`.
    - Translucent glassmorphic pills highlighting core capabilities: "รวมข้อมูลเป็นศูนย์กลาง", "ติดตามสถานะเรียลไทม์", "คำนวณ SLA และบทปรับอัตโนมัติ".
  - **Live Telemetry System Card**: Added a high-tech telemetry widget card displaying system uptime (99.98%), asset inventory count (5,300+ items), active station count (450+ stations), and real-time SSE stream readiness.

## [0.27.0] - 2026-09-29

### Added
- **One-Click Direct Entry Workflow & Session Management**:
  - **Deconstructed Authentication Form (`LoginForm.tsx`)**: Removed traditional email and password inputs, credentials demo helper badge, visibility toggles, and "forgot password" links.
  - **Single-Action Hero Entry Panel**: Implemented a floating hero action panel featuring the updated "Process Claim" branding mark (`ProcessClaimLogoMark`), animated text shimmer, and live online network badge.
  - **Default Session Profile Initialization (`src/lib/session.ts`)**: Created session management utilities initializing the default user profile (`indykantanat` / `indykantanat@gmail.com` - เจ้าหน้าที่บริหารงานเคลม) on one-click entry.
  - **Single Primary Action Button**: Integrated "เข้าสู่ระบบทันที" button with modern gradient interactive styling (`hover:shadow-lg transition-all active:scale-[0.98]`) and immediate pass-through transition to `/dashboard`.
  - **AppShell Dynamic Session Synchronization**: Connected the sidebar user profile badge and dropdown to the active session state, with `clearSession()` executed upon logout.

## [0.26.1] - 2026-09-29

### Fixed
- **Theme Toggle State Logic & Transition Smoothing**:
  - **Eliminate Race Conditions & Desynchronization**: Updated `toggleTheme` in `src/components/theme-provider.tsx` to use functional state updates (`setResolvedTheme((prev) => ...)`), preventing race conditions and desynchronization when the toggle button is clicked rapidly.
  - **Dynamic Theme Icon & Mount Guard**: Verified that the toggle button in `AppShell.tsx` dynamically renders the `Sun` icon in dark mode and the `Moon` icon in light mode, with `mounted` guard protecting against SSR hydration mismatch warnings.
  - **Smooth Transitions & Container Tokens**: Added `transition-colors duration-200` to the sticky top `<header>` in `AppShell.tsx` to prevent abrupt color jumping when switching themes.
  - **Eliminate Background Sticking in Modals**: Replaced hardcoded `bg-white` and border classes in modals and inputs across `TicketsView.tsx` and `OverseasView.tsx` with responsive dark tokens (`dark:bg-[#0f172a]`, `dark:border-white/10`, `dark:text-slate-200`).

## [0.26.0] - 2026-09-29

### Added
- **UX/UI Pro Max Design System & Heuristics Skill Package (`.agents/skills/ux-ui-pro-max/SKILL.md`)**:
  - Installed and initialized the canonical `ux-ui-pro-max` skill package for the workspace.
  - Enforced enterprise visual hierarchy, multi-layer surface elevation, and translucent border architectures.
  - Activated dark/light theme token parity and accessible pastel status ring badges.
  - Integrated micro-interactions (hover lift, active tactile scale compression, live pulse nodes, focus rings).
  - Codified data table ergonomics and WCAG 2.1 accessibility checklists across all frontend modules.

## [0.25.1] - 2026-09-29

### Fixed
- **Root Theme Synchronization & ThemeProvider Context**:
  - **Global ThemeProvider Context (`src/components/theme-provider.tsx`)**:
    - Created React context (`ThemeProvider`, `useTheme`) managing root-level theme state synchronization.
    - Synchronized `.dark` class directly on `document.documentElement.classList` to eliminate sub-container isolation.
    - Added reactive synchronization with `localStorage` (`theme`) and OS system preference (`prefers-color-scheme`).
    - Integrated with anti-FOUC script in `src/app/layout.tsx` to prevent theme flash/flicker on load.
  - **Tailwind CSS v4 Dark Variant & Mesh Isolation**:
    - Corrected `@custom-variant dark (&:where(.dark, .dark *));` in `src/app/globals.css` ensuring 100% selector matching and clean specificity.
    - Scoped `.dark-ambient-mesh` strictly under `:is(.dark)` and `.dark`, preventing dark canvas background from overriding light mode canvas.
  - **Audit Layout Containers & Eliminating Hardcoded Light Backgrounds**:
    - Connected `AppShell.tsx` theme toggle button with `useTheme()` hook: displays `Sun` icon when in dark mode and `Moon` icon when in light mode.
    - Converted static `bg-white` classes in filters, table rows, pagination bars, and modal dialogs across `TicketsView.tsx` and `OverseasView.tsx` into responsive theme tokens (`dark:bg-[#0f172a]`, `dark:bg-[#1e293b]`, `dark:border-white/10`, `dark:text-slate-100`, `dark:text-slate-300`).

## [0.25.0] - 2026-09-29

### Added
- **Eye-Friendly Dark Mode & Sophisticated Visual Depth**:
  - **Refined Low-Fatigue Dark Palette**:
    - Discarded pure pitch black (`#000000`) in favor of low-fatigue slate/zinc charcoal tones:
      - Root Canvas: `#0b0f19`
      - Sidebar & Top Navigation: `#0f172a`
      - Content Cards & Tables: `#1e293b`
    - Ultra-fine translucent borders (`border-white/10`) to delineate cards and surfaces crisply against dark backgrounds.
  - **Ambient Mesh Glow Accents**:
    - Introduced `.dark-ambient-mesh` with fixed subtle radial gradients (`#1e40af12` and `#0284c708`) creating visual depth without data distraction.
    - Added dark elevation shadows (`.dark .shadow-card`, `.dark .shadow-card-hover`).
  - **Interactive Theme Switcher & Anti-FOUC Engine**:
    - Added instant Sun/Moon theme toggle in the sticky top header of `AppShell.tsx` with `localStorage` persistence.
    - Added anti-FOUC inline script in `src/app/layout.tsx` to detect user preference before render.
  - **Text Contrast & Component Harmony Across All Views**:
    - Primary text styled in crisp off-white (`text-slate-100` / `#f8fafc`), secondary labels in muted slate (`text-slate-400` / `#94a3b8`).
    - Standardized tables, filter toolbars, KPI stat cards, and modal dialogs across `DashboardView`, `StationsView`, `TicketsView`, and `AssetsView`.

## [0.24.1] - 2026-09-29

### UI & Styling
- **In-Depth Enterprise Elevation Across Dashboard & Station Tables**:
  - **Dashboard Summary Metric Cards (`DashboardView.tsx`)**:
    - Completely replaced flat solid pastel blocks with modern enterprise-grade cards (`bg-white dark:bg-slate-900 border border-slate-200/80 shadow-xs hover:shadow-card-hover hover:-translate-y-1 hover:border-blue-400/60 transition-all rounded-2xl p-5`).
    - Added vibrant gradient accent stripes (`bg-gradient-to-r from-blue-600 to-indigo-500`, `from-amber-500 to-orange-500`, `from-emerald-500 to-teal-500`, `from-rose-500 to-pink-500`).
    - Integrated modern squircle icon badges with soft pastel glow and ring highlights.
    - Added micro-animated progress bars with gradient fills and clear ratio indicators.
  - **KPIs & Performance Indicator Cards (`DashboardView.tsx`)**:
    - Transformed the plain divided grid into 4 separate modern cards with soft tinted backgrounds, status pill tags, and clear typography.
    - Added vibrant alert styling to SLA overdue metrics (`bg-rose-50 text-rose-700 ring-1 ring-rose-500/20`).
  - **Weekly Overview & 7-Day Activity Sparkline (`DashboardView.tsx`)**:
    - Converted floating Thai calendar abbreviations into an active 7-day mini bar activity sparkline with hover states.
    - Upgraded summary stat boxes into modern interactive cards.
  - **Station Table Row Elevation (`StationsView.tsx`)**:
    - Redesigned `StationTableRow`: added index squircle badge, copy-to-clipboard code pill, clear site type badges, Google Maps GPS pill button with external link icon, and tactile action button group (`active:scale-95`).
  - **AppShell & Elevation Contrast**:
    - Tuned `--background` to `#f1f5f9` (Slate-100 neutral) and updated main content wrappers to `bg-slate-100/75` to provide unmistakable depth and elevation for white cards.
    - Enhanced sticky header with active module context breadcrumb and refined status badge.

## [0.24.0] - 2026-09-29

### UI & Styling
- **Enterprise UX/UI Elevation & Design System Modernization**:
  - **Color & Elevation Tokens (`globals.css`)**:
    - Transitioned neutral palette to refined high-end slate backgrounds (`#f8fafc` slate-50 base) with deep brand navy accents (`#0f172a` / `#1e40af`).
    - Replaced harsh, opaque borders with subtle, low-opacity lines (`border-slate-200/70`) and added multi-layered soft shadows (`.shadow-card`, `.shadow-card-hover`).
    - Added utility classes for glassmorphic surface styling (`.glass-panel`) and interactive card elevation (`.interactive-card`).
  - **Glassmorphism & Surface Styling across AppShell**:
    - Upgraded desktop sidebar and mobile navigation drawer with backdrop blur (`bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/70`).
    - Styled active navigation links as pill-shaped surfaces (`bg-blue-50/90 text-blue-700 ring-1 ring-blue-600/15 font-semibold`).
    - Converted sticky top header to glass panel (`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/70 shadow-2xs`).
  - **Component Harmony & Status Badges (`TicketsView`, `AssetsView`, `StationsView`)**:
    - Replaced generic solid status badges with modern pill-shaped pastel containers featuring delicate rings and vibrant dot indicators (`bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20`, `bg-amber-50 text-amber-700 ring-1 ring-amber-600/20`, etc.).
    - Revamped data tables and filter cards across all modules with `rounded-2xl border border-slate-200/70 bg-white/95 backdrop-blur-xs shadow-card`.
    - Standardized table headers with uppercase tracking and subtle contrast (`bg-slate-50/90 text-slate-500 font-semibold text-[11px] uppercase tracking-wider`).
  - **Tactile Micro-Interactions & Feedback**:
    - Added subtle hover elevation (`hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200`) and tactile button ripple/press feedback (`active:scale-95`).
    - Enhanced pagination footers and action icons with responsive click states.
  - **Dashboard Elevation (`DashboardView`)**:
    - Unified main metric cards, performance indicator grids, weekly trends, and process bottlenecks with the elevated `rounded-2xl border border-slate-200/70 bg-white/95 shadow-card` architecture.

## [0.23.4] - 2026-09-29

### UI & Styling
- **Animated Gradient Text Shimmer for 'Process Claim' Brand Title**:
  - Implemented continuous horizontal light sweep keyframe animation (`@keyframes text-shimmer`) shifting `background-position` from `200% center` to `-200% center` in a seamless 4-second infinite cycle.
  - Tuned luminous color gradient matching system palette: deep brand blue (`#1e40af` / `#1e61f0`) transitioning through vibrant sky cyan (`#38bdf8`) to soft highlight (`#93c5fd` / `#ffffff`) and back to deep blue with dark mode support.
  - Styled sub-title `EQUIPMENT CLAIMS` with solid, non-shimmering typography (`text-[10px] font-semibold text-slate-400 tracking-wider uppercase`) to keep visual focus on the primary brand mark.

## [0.23.3] - 2026-09-29

### Changed & Enhanced
- **New 'Process Claim' Brand Identity & Navigation Header**:
  - Removed legacy FORTH logo asset and its Next.js image wrapper from the top sidebar header.
  - Designed and implemented custom SVG logo mark component `ProcessClaimLogoMark` featuring stylized interlocking geometric ribbons ('P' and 'C') representing the claim lifecycle, workflow progression loop, and active milestone verification node.
  - Integrated modern typographic brand title 'Process Claim' (`font-bold text-base tracking-tight`) with high-contrast palette (`#1e61f0` deep brand blue and `#38bdf8` vibrant cyan).
  - Supported responsive layout state collapsing to centered logo mark when sidebar is minimized, and expanded brand unit on full desktop sidebar and mobile drawer with accessible label `aria-label="Process Claim Home"`.

## [0.23.2] - 2026-09-29

### Performance & Optimization
- **UI Responsiveness & Tab Switching Latency Optimization**:
  - **Client-Side Query Cache & Extended StaleTime**:
    - Created `useStationsQuery` singleton cache hook with a 3-minute (`180,000ms`) `staleTime`, eliminating redundant HTTP requests when navigating between Dashboard, Tickets, Stations, and New Ticket forms.
    - Extended in-memory cache TTL across `useTicketsQuery`, `useEquipmentsQuery`, and `useRmaQuery` from 4–5 seconds to 3 minutes (`180,000ms`), preventing full unmount re-fetching, layout shifts, and spinner flickering during rapid tab switching.
    - Tuned SWR dashboard deduping interval to 3 minutes (`180,000ms`) with `revalidateIfStale: false` and `focusThrottleInterval: 60,000ms` for seamless 0ms tab return.
  - **Eliminated Unnecessary Table Re-renders with Memoized Row Components**:
    - Extracted and wrapped `StationTableRow`, `TicketTableRow`, and `AssetTableRow` with `React.memo` to shield unaffected row trees from re-rendering during parent state changes (such as single-row selection, checkbox toggle, or modal opening).
    - Stabilized event handlers and mutation callbacks using `React.useCallback`.
  - **Non-blocking State Transitions & Deferred Filtering**:
    - Wrapped heavy cascading filters (province, district, subdistrict, station), category/vendor selectors, filter reset actions, and pagination navigation inside React 18's `useTransition` (`startTransition`) across `StationsView`, `TicketsView`, and `AssetsView`.
    - Integrated `useDeferredValue` for search queries to prevent keystroke latency and blocking main-thread operations during client-side search filtering.

## [0.23.1] - 2026-09-29

### Changed & Enhanced
- **Table Header Localization Across Equipment & Station Information Modules**:
  - Replaced hash symbol `#` column header with localized Thai label `ลำดับ` across both **ข้อมูลอุปกรณ์** (`AssetsView.tsx`) and **ข้อมูลสถานี** (`StationsView.tsx`).
  - Adjusted header cell width from `w-12` to `w-16` to comfortably accommodate Thai text while maintaining alignment (`text-center`), padding (`py-3 px-4`), typography (`text-xs font-medium`), and color tokens (`text-muted-foreground`).
  - Verified and preserved pagination row indexing calculations across all pages (`(currentPage - 1) * pageSize + idx + 1`).

## [0.23.0] - 2026-09-28

### Added & Enhanced
- **Interactive Dashboard Deep-Navigation & Pre-Filtered Query Routing Across Modules**:
  - **Top Overview Metric Cards Navigation**:
    - Wrapped all 4 primary metric cards ('เคสทั้งหมด', 'อยู่ระหว่างดำเนินการ', 'เคลมสำเร็จ / ปิดเคส', 'ปฏิเสธเคลม') with interactive Next.js `<Link>` elements and subtle hover transitions (`hover:-translate-y-1 hover:shadow-md`, scale transitions on iconography, and direct action affordance links).
    - Mapped routing directly to the Claim List module (`/claims` and `/tickets`) with respective pre-applied query parameters:
      - 'เคสทั้งหมด': `/tickets?status=all`
      - 'อยู่ระหว่างดำเนินการ': `/tickets?status=in_progress`
      - 'เคลมสำเร็จ / ปิดเคส': `/tickets?status=closed`
      - 'ปฏิเสธเคลม': `/tickets?status=rejected`
  - **Performance KPIs & Overdue Routing**:
    - 'เกินกำหนด (Overdue)': Navigates to `/tickets?overdue=true`, dynamically toggling on the 'เฉพาะที่เกินกำหนด' checkbox filter in the target list table.
    - 'อายุงานค้างกลาง': Navigates to `/tickets?status=in_progress` to inspect ongoing active cases.
    - 'ปิดทันกำหนด': Navigates to `/tickets?status=closed&onTime=true` for compliant completed cases.
    - 'เวลาปิดงานกลาง': Navigates to `/tickets?status=closed` to examine turnaround times for closed cases.
  - **Status Breakdown Rows ('สถานะงาน')**:
    - Attached interactive click handlers to each of the 6 individual workflow stages (รับแจ้ง/รอตรวจสภาพ, ส่งศูนย์บริการแล้ว, รออะไหล่/กำลังซ่อม, ซ่อมเสร็จ/รอส่งมอบ, ปิดเคส, ปฏิเสธเคลม).
    - Clicking any row navigates to the claim table pre-filtered by that specific stage identifier (e.g., `/tickets?stage=1&status=1`).
  - **Service Center Breakdown Table ('ระยะเวลาที่งานอยู่กับศูนย์บริการ')**:
    - Entire vendor rows (e.g., Huawei, Hytera, etc.) are clickable, routing to `/tickets?vendor=${vendor}`.
    - Clicking the overdue badge within any vendor row directly filters cases for that vendor that are overdue (`/tickets?vendor=${vendor}&overdue=true`).
  - **Claim List (`TicketsView`) Target Filter Synchronization Logic**:
    - Integrated `useSearchParams` to reactively synchronize URL query parameters (`status`, `stage`, `overdue`, `onlyOverdue`, `vendor`, `onTime`) into component state and `appliedFilters`.
    - Added aggregate status support for `in_progress` (matching stages 1 through 4), `closed` (stage 5), and `rejected` (stage 6).
    - Dynamic population of available service centers from active ticket records.
    - Wrapped `TicketsView` with `<Suspense>` boundary in `src/app/(authenticated)/tickets/page.tsx` for clean Next.js App Router client rendering.
    - Configured Next.js rewrites in `next.config.ts` mapping `/claims` directly to `/tickets`.

## [0.22.9] - 2026-09-28

### Added & Enhanced
- **Interactive Calendar Date Pickers & Localized Thai BE Formatting Across Claim Edit Form**:
  - **Interactive Date Pickers Component (`DatePickerInput.tsx`)**:
    - Replaced static text inputs across all 5 date fields: 'วันที่รับแจ้ง (Reported Date)', 'กำหนดแล้วเสร็จ (SLA 60 วัน)', 'วันที่ส่งศูนย์บริการ', 'ติดตามล่าสุด', and 'วันที่รับคืน'.
    - Integrated native HTML5 date input with `showPicker()` trigger, allowing users to click either the input box or the calendar icon adornment to immediately open the date selection dialog.
    - Provided seamless date clearing via a dedicated reset button (`X`) for optional timestamps (`sentDate`, `lastTrackDate`, `returnDate`, `deadlineDate`) permitting empty / `—` state transitions without friction.
  - **Calendar Formatting & Thai Buddhist Era (BE) Support**:
    - Localized display dates cleanly into Thai Buddhist Era format (e.g., `13 มิ.ย. 2569`) while internally storing and sending standard ISO format (`YYYY-MM-DD`) in API payloads (`reportedDateIso`, `sentDateIso`, `deadlineDateIso`, `lastTrackDateIso`, `returnDateIso`).
    - Implemented timezone-safe local date parsing in `caseDuration.ts` (`parseThaiDate`, `formatISODate`, `toISODateString`, `formatDisplayThaiDate`), eliminating timezone offset shifts, hydration warnings, and NaN errors.
  - **Dynamic SLA Recalculation**:
    - When modifying or picking 'วันที่รับแจ้ง (Reported Date)', the system automatically recomputes and pre-fills 'กำหนดแล้วเสร็จ (SLA 60 วัน)' by strictly adding 60 days to the selected date.
    - Synchronized date displays across the detail sidebar, claim list table, and modals.

## [0.22.8] - 2026-09-28

### Fixed & Enhanced
- **Full Field Editing in Edit Claim Modal, Transactional Persistence & End-to-End View Synchronization**:
  - **Make All Fields Editable**:
    - Expanded Edit Claim modal (`TicketDetailView.tsx`) to support comprehensive editing for all attributes under 'อุปกรณ์' (`serialNo`, `vendor`, `model`, `category`, `deviceType`, `location`) and 'ข้อมูลเคส' (`warrantyStatus`, `serviceCenter`, `reportedDate`, `sentDate`, `deadlineDate`, `lastTrackDate`, `returnDate`, `reporter`, `assignee`).
    - Added appropriate input controls: native `<select>` dropdowns for Warranty Status and Service Center, date/timestamp inputs with auto 60-day deadline recalculation, and responsive text inputs.
    - Organized modal into clean, responsive sections with scrollable container and loading indicators.
  - **Transactional Database Persistence**:
    - Expanded `TicketDocument` schema in `database.ts` and `Ticket` interface in `useTicketsQuery.ts` with all sidebar attributes.
    - Updated `updateTicket` mutation handler to dispatch all modified fields to backend `PUT`/`PATCH` API, committing updates to both MongoDB Atlas and persistent disk storage without dropping payload properties.
  - **Synchronize All Views & Dynamic Calculations**:
    - Immediate optimistic update and cache invalidation (`invalidateTicketsCache()`) on save success.
    - Synchronized all dependent views (Detail Sidebar, Top Summary Cards, Horizontal Stepper, Claim List table, and Dashboard) in real time without manual browser refresh.
    - Dynamically recalculated case age ('อายุงาน') and overdue status ('เกินกำหนด X วัน') based on updated timestamps.

## [0.22.7] - 2026-09-28

### Fixed & Enhanced
- **Strict 60-Day SLA Due Date Calculation & Conditional Rendering for Device Claim History**:
  - **Dynamic Due Date Calculation (60-Day SLA)**:
    - Implemented `calculateDueDate` in `caseDuration.ts` to strictly compute the target completion date as 60 days after the case reported date (`reportedDate + 60 days`).
    - For reported date `13 มิ.ย. 2569`, due date accurately computes to `12 ส.ค. 2569` instead of an arbitrary date (e.g. `12 พ.ย. 2569`).
    - Dynamically computed remaining days as `dueDate - currentDate`, reflecting `(เกินกำหนด 47 วัน)` or `(เหลืออีก X วัน)` in both the circular progress indicator and the metadata table row (`กำหนดแล้วเสร็จ`).
    - Automatically synced `deadlineDate` in the ticket edit modal when `reportedDate` changes.
  - **Conditional Rendering & Cleanup of Device History**:
    - Removed all hardcoded dummy history records (`ทดสอบระบบ`, `test2`) from default state.
    - Assigned distinct serial numbers to sample tickets in `tickets.json` and `seed_mongodb.mjs` so serial number `1000167600349` is genuinely a first-time claim.
    - Implemented strict conditional rendering: when `historyCases.length === 0` (first-time claim with no prior database records for this Serial Number), the entire `ประวัติเคสอื่นของอุปกรณ์ชิ้นนี้` section is completely removed from the view.

## [0.22.6] - 2026-09-28

### Fixed & Enhanced
- **Case Detail View (CLM-2026-001) End-to-End Synchronization, Unified Date Calculations & Real-Time Subscription**:
  - **End-to-End Field Synchronization**:
    - Reactively bound all sections across `TicketDetailView.tsx` (Top Header, 5-stage Horizontal Stepper, Case Summary Sidebar 'ข้อมูลเคส' / 'อุปกรณ์', and Timeline 'ลำดับเหตุการณ์') to the latest database record.
    - Enabled instant revalidation and re-rendering across all dependent fields upon editing details or transitioning status without requiring a manual browser refresh.
  - **Uniform Day & Timestamp Calculations**:
    - Harmonized Elapsed Case Age ('อายุงาน') between the top summary card (`107 อายุงาน (วัน)`) and sidebar table row (`อายุงาน: 107 วัน`) using normalized calendar midnight subtraction (`currentDate - reportedDate` from 13 มิ.ย. 2569 to 28 ก.ย. 2569 = 107 วัน).
    - Dynamically computed Remaining Days ('กำหนดแล้วเสร็จ') in `calculateRemainingDays` as `dueDate - currentDate`, keeping progress circle stroke offset, remaining days counter, and overdue indicators in exact sync with calendar dates.
    - Synchronized active stage duration in the timeline (`ค้างอยู่ 107 วัน`) with the overall case age and stage transitions.
    - Extended `parseThaiDate` in `caseDuration.ts` to support optional timestamp components (`HH:mm:ss`), preventing date parsing fallback failures.
  - **Real-Time Subscription & Cache Invalidation**:
    - Attached live listeners to `caim:realtime:ticket`, `caim:tickets:invalidated`, `visibilitychange`, and `focus` events to synchronize data from concurrent sessions or external edit modals immediately.
    - Integrated direct single-ticket fetching (`/api/tickets?id=...`) and automated cache invalidation via `invalidateTicketsCache()`.

## [0.22.5] - 2026-09-28

### Fixed & Enhanced
- **Claim Edit Modal Save Mutation, Status Selector Binding & Parent Cache Synchronization**:
  - **Database Persistence & API Mutation**:
    - Enhanced `/api/tickets` controller with dual `PUT` and `PATCH` HTTP method handlers.
    - Added support for record lookup via body ID or query param ID (`CLM-2026-001`).
    - Normalized field name aliases (`problemDesc` / `description`, `serialNo` / `serialNumber`).
    - Recalculated dynamic duration and overdue state via `calculateCaseDuration` upon save, updating `ageDays` and `isOverdue`.
    - Handled automatic equipment status release when status changes to 'ปิดเคส' (5) or 'ปฏิเสธเคลม' (6).
    - Guaranteed dual persistence across MongoDB Atlas (with Transaction Log) and persistent disk store, returning HTTP 200 OK.
  - **Status Badge Selection & Value Binding**:
    - Normalized `statusCode` and `status` label in `handleEdit` and `handleStatusChange` within `TicketsView.tsx`.
    - Bound pill buttons (`รับแจ้ง`, `ส่งศูนย์`, `รออะไหล่`, `ซ่อมเสร็จ`, `ปิดเคส`, `ปฏิเสธเคลม`) accurately using dual criteria (`editForm.statusCode === st.code || editForm.status === st.label`).
    - Added accessible `aria-pressed` and enhanced active ring visual styling.
  - **Parent Table & Cache Invalidation**:
    - Dispatched `updateTicket` mutation directly to backend with optimistic update and rollback protection in `useTicketsQuery`.
    - Invalidated query cache immediately (`invalidateTicketsCache()`) on save success to re-render parent table status badges and details in real time without page reload.
    - Automated modal closure (`handleCloseModal()`) upon successful save with confirmation toast notification.
    - Added loading state indicator with `Loader2` spinner on submit button during active network mutations.

## [0.22.4] - 2026-09-28

### Added & Enhanced
- **Dynamic Stage Elapsed Days & Reactive Summary Synchronization for Overseas RMA Timeline Modal**:
  - **Dynamic Stage Elapsed Days (Parenthesized '(X วัน)')**:
    - Implemented `calculateStageDuration` in `src/lib/utils/rmaDuration.ts`.
    - Completed steps dynamically compute elapsed duration as `endDate - startDate` (e.g. `(1 วัน)`, `(5 วัน)`, `(6 วัน)`).
    - Active steps (e.g. Stage 6 'จีน — เข้ากระบวนการซ่อม') dynamically compute live elapsed days from stage start timestamp up to current date/time (`currentDate - stageStartDate`).
    - Automatically applies orange/red warning highlight (`font-bold text-[#ea580c]` with SLA overdue badge) when actual duration exceeds standard SLA days.
  - **Bidirectional Recalculation on Manual Date Edits**:
    - When timestamps are modified via 'แก้ไขที่รายขั้น (กรอกย้อนหลัง)', instantly recomputes the specific stage's elapsed days without lag.
    - Immediately propagates and recalculates modal bottom cumulative counter (`calculateCumulativeStagesDays`, e.g. 'ใช้ไปแล้ว 82 วัน') based on updated intervals.
  - **Outer Module Totals Synchronization (Parent Table & Dashboard)**:
    - Saving stage adjustments immediately synchronizes the outer RMA table's columns—specifically 'รวม' (Total Days) and 'บทปรับผู้ขาย' (Vendor Penalty Days)—without requiring a full page refresh.
    - Persists updated timestamps and recalculated metrics to database (`PUT /api/rma`) and disk storage.

## [0.22.3] - 2026-09-28

### Added & Fixed
- **Dynamic Elapsed Total Days & Vendor Penalty Days Calculation for Overseas RMA Table ('รวม' & 'บทปรับผู้ขาย')**:
  - **Dynamic Total Days Calculation ('รวม')**:
    - Created dedicated calculation utility `src/lib/utils/rmaDuration.ts` implementing `calculateRmaTotalDays`.
    - Computes elapsed days dynamically from RMA issue date (`openDate` / 'เปิดใบ') up to the current date (`Math.floor((currentDate - issueDate) / 86400000)`).
    - Ensures active RMA cases (`statusBadge === "in_progress"` / 'กำลังดำเนินการ') increment daily in real time.
    - Freezes total days at delivery/completion date when RMA shipment is completed (`statusBadge === "returned"` / 'ของกลับถึงแล้ว').
  - **Vendor Penalty Days Calculation ('บทปรับผู้ขาย')**:
    - Implemented `calculateRmaPenaltyDays` strictly counting elapsed penalty days starting when the case enters stage 6 ('จีน (เข้ากระบวนการซ่อม)' / `hasVendorPenalty: true`).
    - Provides live elapsed penalty days against the 14-day vendor standard limit (`{elapsedPenaltyDays} วัน / จาก 14 วัน`).
    - Automatically triggers overdue warning badges and deep red styling (`text-[#dc2626]`, `bg-[#fee2e2]/70` badge, and table row highlight) when exceeding 14 days (`เกิน X วัน`).
    - Accurately freezes penalty duration upon stage 6 completion or overall case return.
  - **Date Parser & Timezone Consistency**:
    - Built `parseRmaCalendarDate` and `toLocalMidnight` supporting Gregorian (YYYY-MM-DD, ISO, YYYY-MM-DD HH:mm) and Thai Buddhist Era (BE >= 2400) formats.
    - Completely eliminates timezone conversion drift and off-by-one errors during calendar day subtraction.
  - **Full System Integration**:
    - Integrated dynamic calculation into `OverseasView.tsx` table cells, filter handlers (`onlyOverduePenalty`), and `GET /api/rma` / `POST /api/rma` API endpoints.

## [0.22.2] - 2026-09-28

### Fixed
- **Dynamic Case Duration Calculation & Thai Buddhist Era (BE) Date Parsing ('อายุงาน' Column)**:
  - **Dynamic Elapsed Days Calculation**:
    - Created centralized date utility `src/lib/utils/caseDuration.ts` implementing `Math.floor((currentDate - reportedDate) / (1000 * 60 * 60 * 24))`.
    - Resolved bug where active open cases (e.g. reported on 13 มิ.ย. 2569) erroneously displayed static "0 วัน".
    - Active cases compute elapsed days dynamically relative to current date; closed or rejected cases (`statusCode: 5 | 6`) freeze duration at completion date (`closedAt` / `updatedAt`).
  - **Thai Buddhist Era (BE) & Calendar Date Parsing Support**:
    - Implemented `parseThaiDate` supporting Thai abbreviated and full month names (ม.ค. - ธ.ค., มกราคม - ธันวาคม) and converting Buddhist Era years (BE >= 2400 subtracted by 543 to CE, e.g. 2569 -> 2026) across both text formats and slash/dash formats.
    - Prevents `NaN` or negative day values when subtracting reported dates from current dates.
  - **SLA Overdue Threshold & Alert Styling**:
    - Added automatic overdue detection against the 7-day SLA threshold.
    - Rendered highlighted overdue styling with deep red text (`text-[#dc2626]`), warning badge (`bg-[#fee2e2]/70` with `AlertTriangle` icon), and table row soft red tinting (`bg-[#fff5f5]`).
  - **System-Wide Metric Synchronization**:
    - Integrated `calculateCaseDuration` into `TicketsView.tsx`, `TicketDetailView.tsx`, `NewTicketView.tsx`, `/api/tickets`, and dashboard KPI calculations (`calculateMetrics.ts`), ensuring complete data consistency across all views.

## [0.22.1] - 2026-09-28

### Fixed
- **Resolved React Minified Error #418 (SSR / Client Hydration Mismatch)**:
  - **Deterministic Initial Date & Timestamp State**:
    - Refactored `lastSyncTime` in `useRealtimeDashboard.ts` to initialize as `null` on both server and client initially, hydrating `new Date()` exclusively post-mount via `useEffect`.
    - Added `mounted` state flag (`const [mounted, setMounted] = useState(false)`) in `DashboardView.tsx` to prevent server/client timestamp drift and locale ICU formatting discrepancy (`toLocaleTimeString`).
  - **Hydration Boundary Protection**:
    - Added `suppressHydrationWarning` on the dynamic status badge and formatted sync time text nodes.
    - Added `suppressHydrationWarning` across summary card numbers (`metrics.summary.*`), KPI performance numbers (`metrics.kpi.*`), and weekly calendar day headers (`metrics.weekly.daysBreakdown`).
    - Guaranteed identical initial DOM output during SSR and client hydration with zero console warnings.

## [0.22.0] - 2026-09-28

### Added & Optimized
- **Instant Pre-rendering, Server-Side Hydration & SWR Caching for Main Dashboard ('ภาพรวมงานเคลมอุปกรณ์')**:
  - **Instant Server-Side Rendering (SSR) & Zero-Delay Hydration**:
    - Converted `src/app/(authenticated)/dashboard/page.tsx` to an async Server Component that fetches pre-aggregated metrics on the server and embeds them directly into the initial HTML.
    - Updated `DashboardView.tsx` to accept `initialMetrics`, rendering all 4 summary cards, KPI indicators, work status distributions, and bottleneck metrics with zero loading delay and zero client spinners.
  - **Stale-While-Revalidate (SWR) Caching Layer**:
    - Integrated `swr` into `src/hooks/useRealtimeDashboard.ts` with `fallbackData: initialMetrics`, non-zero `dedupingInterval` (5000ms), and `keepPreviousData: true`.
    - Enabled instantaneous client-side navigation between tabs/pages displaying cached metrics immediately in 0ms while silently revalidating in the background.
    - Coupled real-time SSE (`event: metrics` / `caim:realtime:metrics`) with SWR's `mutate` for instant in-memory cache updates without redundant HTTP requests.
  - **Optimized Pre-computed Query Aggregation Service (`dashboardStatsService.ts`)**:
    - Built a high-performance in-memory pre-aggregated summary cache with dirty-checked cache invalidation and disk persistence (`src/data/dashboard_summary.json`).
    - Added MongoDB compound indexing (`{ statusCode: 1, vendor: 1, createdAt: -1 }`) and lean projection to eliminate slow ad-hoc table scans (`COLLSCAN`), reducing endpoint response time to single-digit / sub-millisecond speeds (0.12ms).
    - Updated `/api/dashboard/stats` and `/api/realtime/stream` to utilize the pre-aggregated stats engine with proper HTTP cache headers.

## [0.21.9] - 2026-09-25

### Added & Enhanced
- **Inline Date-Time Editing Workflow for RMA Stage Tracking Modal (`OverseasView.tsx`)**:
  - **Inline Step-by-Step Date Range Editing**:
    - Enabled edit mode across all stages along the vertical timeline upon clicking "แก้ไขที่รายขั้น (กรอกย้อนหลัง)" without obscuring or navigating away from the timeline track.
    - Replaced static date texts (e.g. `'8 ก.ค. 2569 → 10 ก.ค. 2569'`) with interactive `datetime-local` start and end inputs equipped with instant calendar popup triggers (`showPicker()`).
    - Added stage status switching (`completed`, `active`, `pending`) and optional stage remarks input within the row.
  - **Dynamic Duration & Penalty Recalculation**:
    - Implemented immediate elapsed duration recalculation (`Math.round(diffMs / 86400000)`) whenever the user alters start or end dates for any stage.
    - Automatically flagged exceeded stage durations with warning highlight styling (`bg-orange-100 text-[#ea580c] border border-orange-200`) and penalty indicator (`เริ่มนับบทปรับผู้ขาย`).
    - Recalculated and live-updated the overall summary counter in the modal footer (`ใช้ไปแล้วรวม X วัน · แผนมาตรฐานรวม 60 วัน`), highlighting in orange/red if exceeding standard duration.
  - **Logical Validation & Persistence Controls**:
    - Enforced validation ensuring end date-time is never earlier than start date-time, with real-time red warning outline and localized error alert (`วันและเวลาสิ้นสุดต้องไม่ก่อนวันเริ่มต้น`), preventing form submission when invalid.
    - Added explicit "บันทึกการแก้ไข" (Save Changes) and "ยกเลิก" (Cancel) controls. Cancel restores the initial snapshot with zero data loss, while Save commits updated timestamps, recalculated duration, and stage history to MongoDB and persistent storage via `updateRma` and revalidates queries.
  - **Database & Query Schema Extension**:
    - Added `stageHistory` array to `RmaDocument` (`src/types/database.ts`) and `RmaItem` (`src/hooks/useRmaQuery.ts`) for permanent persistence of stage-by-stage timestamps.

## [0.21.8] - 2026-09-25

### Fixed & Improved
- **Interactive Controls & Retroactive Stage Editing in Overseas RMA Modal (`OverseasView.tsx`)**:
  - **Activated 'แก้ไขที่รายขั้น (กรอกย้อนหลัง)' Action Workflow**:
    - Wired an active `onClick` handler on the button to toggle into an interactive retroactive step-editing view across all 8 stages.
    - Added dedicated editing controls for each stage: stage status select (`completed`, `active`, `pending`), start date (`startDate`), end date (`endDate`), actual elapsed days (`actualDays`), and notes (`notes`).
    - Added "บันทึกข้อมูลย้อนหลัง" (Save) and "ยกเลิก" (Cancel) buttons with transactional persistence to database via `updateRma`.
  - **Interactive Native Date-Time Calendar Picker ('วันและเวลาที่เกิดขึ้นจริง')**:
    - Replaced static text input with an interactive `datetime-local` input backed by `actualDateTime` state and `dateTimeInputRef`.
    - Removed `pointer-events-none` blocking from the calendar icon button and wired it to `dateTimeInputRef.current.showPicker()` for instant calendar popup invocation.
    - Added real-time Thai display timestamp preview (`formatDisplayDateTime`).
  - **Dynamic Stage Transition Button Binding**:
    - Dynamically computed the primary stage transition button label based on the current stage and next stage (e.g. `› ปิดขั้น "จีน — ซ่อม" → เข้าขั้น "ขนส่งกลับ"`, or `› ปิดใบส่งซ่อม RMA (ของกลับถึงแล้ว)` for stage 8).
    - Coupled date-time capture to stage advance mutation, persisting updates directly to MongoDB / server persistent storage.
  - **Fixed Segmented Progress Count Badge**:
    - Replaced hardcoded `5/8` fallback with dynamic calculation `{item.currentStageNumber}/{item.totalStages}`.

## [0.21.7] - 2026-09-25

### Refactored & Purged
- **Purge All Mock Data & Fallback Fixtures**:
  - **Removed Hardcoded Mock Stores & Fallbacks**:
    - Purged `INITIAL_FALLBACK_TICKETS` from `useRealtimeDashboard.ts` and set dashboard initial state to pure computed metrics (`calculateDashboardMetrics([])` = 0) until API response arrives.
    - Purged `ASSETS` mock array baseline from `src/app/api/equipments/route.ts` and `src/hooks/useEquipmentsQuery.ts`; equipment query cache and fallbacks now start empty (`[]`) and bind strictly to live database records.
    - Purged `AVAILABLE_CASES` mock array and `(typeof ASSETS)[0]` type reference from `OverseasView.tsx`; linked claim case dropdowns now resolve dynamic live tickets and database equipments.
    - Purged `STATIONS` baseline fixture from `src/app/api/stations/route.ts`, `NewTicketView.tsx`, `TicketsView.tsx`, and `StationsView.tsx`; station lists and cascade filters now query exclusively from `/api/stations`.
  - **Clean Empty-State UI Views**:
    - Ensured every query reflects the true state of the database—when the database is empty (`[]` or `null`), the system cleanly renders authentic empty-state views (e.g., "ไม่พบข้อมูลอุปกรณ์", "ไม่พบเคสที่ตรงกับเงื่อนไขการค้นหา", "ไม่พบรายการส่งซ่อมต่างประเทศที่ตรงกับเงื่อนไข", "ไม่พบข้อมูลสถานีที่ค้นหา") rather than resurrecting static sample fixtures.
  - **Unified Real-Time Dashboard & SSE Pipeline**:
    - Updated `/api/realtime/stream` to integrate server-side persistent ticket storage fallback seamlessly with MongoDB Atlas for zero-latency metric broadcasting.

## [0.21.6] - 2026-09-25

### Fixed & Improved
- **Cross-Device & Cross-Browser Data Synchronization (`useRmaQuery`, `useRealtimeDashboard`, `useTicketsQuery`)**:
  - **Removed Browser-Specific Storage Dependencies**:
    - Eliminated `localStorage` (`getDeletedRmaIds`, `getDeletedTicketIds`, `getCustomTickets`, `addCustomTicket`, `addDeletedTicketId`, `addDeletedRmaId`) as an authority for data fetching across client machines, ensuring all devices fetch directly from the shared remote database without local state partitioning.
    - Updated `NewTicketView.tsx` to dispatch case creation exclusively to `/api/tickets` with automatic cache invalidation (`invalidateTicketsCache()`).
    - Updated `useRealtimeDashboard.ts` to compute metrics purely from server records (`/api/tickets` and `/api/dashboard/stats`) without mixing browser-local tickets.
  - **Eliminated Mock Fallback Resurrection in Overseas RMA**:
    - Created `src/data/rma.json` and `src/data/deleted_rma.json` server-side data files paired with `src/lib/storage/serverRmaStorage.ts` to guarantee durable persistence across Vercel serverless worker recycles.
    - Created unified `useRmaQuery` hook replacing local `INITIAL_RMA_ITEMS` and preventing stale mock lists from reappearing on external machines.
    - Wired `OverseasView.tsx` directly to `useRmaQuery` with optimistic updates and immediate database deletion.
  - **Strict No-Cache Headers & Dynamic Execution Enforced**:
    - Applied `NO_CACHE_HEADERS` (`Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0`, `Pragma: no-cache`, `Expires: 0`, `Surrogate-Control: no-store`, `X-Accel-Buffering: no`) to all success and error responses (400, 404, 409, 500) across `/api/stations`, `/api/equipments`, `/api/tickets`, `/api/rma`, `/api/assets`, and `/api/dashboard/stats`.
    - Added `X-Accel-Buffering: no` to `next.config.ts` for all `/api/:path*` routes.
  - **Window Focus & Real-Time Cache Revalidation**:
    - Added `refetchOnWindowFocus` and `visibilitychange` listeners across all query hooks (`useEquipmentsQuery`, `useTicketsQuery`, `useRmaQuery`, `useRealtimeDashboard`, `useRealtimeSync`) to immediately re-sync data whenever a device/browser tab becomes active.

## [0.21.5] - 2026-09-25

### Fixed & Improved
- **Claim Table Deletion Persistence & Serverless Durability (`TicketsView` & `/api/tickets`)**:
  - **Real Database Deletion Mutation**: Connected the 'ลบ' (Delete) button to trigger an actual HTTP `DELETE /api/tickets?id=<ID>` call to MongoDB Atlas, releasing equipment locks (`status: "active"`), writing audit logs (`CLAIM_DELETED`), and preventing database rollback issues.
  - **Eliminated Mock Dataset Resurrection**: Removed hardcoded `INITIAL_TICKETS` from `TicketsView.tsx` and removed the flawed merge logic (`!apiTickets.some(...)`) that previously restored deleted tickets from initial mock state upon table reload or view switch.
  - **Persistent Server-Side Deletion Registry**: Created `src/lib/storage/serverTicketStorage.ts` with `deleted_tickets.json` to persist deleted ticket IDs across Vercel serverless worker recycles and cold starts.
  - **Shared Query Cache & Invalidation (`useTicketsQuery`)**:
    - Created unified `useTicketsQuery` hook providing optimistic updates, immediate rollback handling on network failure, and automatic cache invalidation (`invalidateTicketsCache()`) upon database confirmation.
    - Updated query response handling so reduced or empty lists from the backend are reflected directly into the cache without being overwritten by stale fallback data.
    - Added real-time window event listener (`caim:realtime:ticket`) to auto-remove deleted items across open tabs and windows.
  - **Optimistic UI & Dynamic Pagination Clean-up**:
    - Deleted rows disappear immediately from the table view with optimistic state transition.
    - Re-bound table rows mapping to `paginatedTickets` and wired dynamic footer controls: interactive rows-per-page selector (10, 20, 50), dynamic row count indicator (`แสดง X–Y จาก Z เคส`), and active previous/next page navigation buttons.


### Fixed & Improved
- **Anti-CDN & Browser Stale Caching Elimination (Vercel & Next.js)**:
  - Configured global `headers()` block in `next.config.ts` enforcing `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0`, `Pragma: no-cache`, `Expires: 0`, and `Surrogate-Control: no-store` for all `/api/:path*` routes to disable aggressive Vercel Edge CDN caching.
  - Enforced `export const dynamic = "force-dynamic"`, `export const revalidate = 0`, and `export const fetchCache = "force-no-store"` across all API routes (`/api/equipments`, `/api/stations`, `/api/tickets`, `/api/rma`, `/api/assets`, `/api/dashboard/stats`, `/api/dashboard/stream`, `/api/realtime/stream`, `/api/realtime/sync-check`).
  - Added centralized `NO_CACHE_HEADERS` utility in `src/lib/constants/httpHeaders.ts` applied to all JSON responses.
- **Centralized Database State & Local Isolation Removal**:
  - Removed device-level `localStorage` partitioning (`CUSTOM_ASSETS`) from `useEquipmentsQuery.ts`, ensuring the centralized MongoDB Atlas database is the single source of truth across all clients and IP addresses.
  - Eliminated user-IP or session-based state divergence between different browsers and networks.
- **Real-Time Cross-Client & Cross-IP Synchronization**:
  - Upgraded `/api/realtime/stream` (SSE) to poll `caim.transaction_logs` every 2.5 seconds, bridging the serverless isolation gap between separate Vercel lambda instances and broadcasting all mutations across all connected IP addresses.
  - Implemented `/api/realtime/sync-check` lightweight delta-sync route querying MongoDB `transaction_logs` with `since` timestamp.
  - Enhanced `useRealtimeSync` hook with dual-channel sync (persistent SSE + 4s delta sync poller + visibility/focus revalidation), automatically invalidating client-side caches and triggering background refetching across all active sessions upon any user update.

## [0.21.3] - 2026-09-25

### Fixed & Improved
- **Equipment Registry Persistence & Data Integrity (`AssetsView` & `/api/equipments`)**:
  - **Permanent Multi-Tier Database & Disk Persistence**: Solved data loss on reload by implementing dual-layer persistence (MongoDB Atlas transactional collections `equipments`, `assets`, `transaction_logs` paired with persistent disk store `src/data/custom_equipments.json` and client-side `localStorage`), ensuring newly added devices are never lost even during network timeouts or worker recycles.
  - **Duplicate Serial Number Rejection**: Added pre-insert uniqueness validation returning HTTP 409 Conflict with clear Thai guidance if a duplicate serial number is submitted, preventing accidental overwrites that kept the count static.
  - **Dynamic Incrementing Total Counter**: Fixed total counter ('ทั้งหมด 644 รายการ') to dynamically increment upon adding a device (e.g. 644 -> 645) and retain the new count across page reloads and view changes.
  - **Permanent Top-of-Table Sorting**: Updated `/api/equipments` to sort query results by `{ createdAt: -1, updatedAt: -1, _id: -1 }` and configured optimistic updates to prepend at index 0, ensuring newly added equipment appears permanently at the top of the table list.
  - **Race-Condition & Stale-Cache Prevention in Query Hook (`useEquipmentsQuery`)**: Resolved in-flight fetch race condition where unawaited invalidations reverted newly added devices to stale cache. Pre-populated query cache from persistent store on mount and prevented fetch errors from purging custom records.
  - **Form Submission & Viewport Reset**: Updated `handleSaveDevice` in `AssetsView` to automatically clear active search queries/filters and reset pagination to page 1 upon creating an equipment so the new row at the top is immediately visible.

## [0.21.2] - 2026-09-25

### Fixed & Improved
- **Unified Equipment Query Hook & Shared Cache Invalidation (`useEquipmentsQuery`)**:
  - **Resolved 645 vs 644 Inconsistency**: Fixed isolated state and legacy `localStorage` discrepancy between `AssetsView` and `NewTicketView` by binding both components to a single authoritative source of truth.
  - **Unified Query Key & Cache Layer**: Created `useEquipmentsQuery` hook using shared query key `['equipments']` with reactive in-memory cache and automatic cache invalidation (`invalidateEquipmentsCache`).
  - **Automatic Database Synchronization**: Added auto-sync for any offline/local custom assets from browser storage to MongoDB Atlas on initial boot, ensuring all active records are unified.
  - **Bidirectional Dynamic Sync**: Bound dropdown list, counter badges, modals, and tables across both views to the same reactive state so mutations (create, update, delete) update all UI elements in real time.

## [0.21.1] - 2026-09-25

### Fixed & Improved
- **Device Registry Dropdown & Action Link Synchronization (`NewTicketView`)**:
  - **Complete Device Registry Dropdown**: Removed hardcoded 50-item limit (`.slice(0, 50)`), now querying and displaying the complete equipment registry (all 644+ items) directly from database.
  - **Live Search & Autocomplete**: Upgraded real-time search across Serial Number, Vendor, Model, Device Name, and Description with clear button.
  - **Dynamic View-All Link & Registry Modal**: Made 'ดูทะเบียนอุปกรณ์ทั้งหมด' interactive with live dynamic count badge bound directly to database count (`equipments.length`), opening a full Equipment Registry Modal with search, filters, and 1-click equipment selection into the claim form.
  - **Real-Time Data Consistency**: Integrated `useRealtimeSync` hook into `NewTicketView` to ensure equipment creation, updates, and deletions immediately update the dropdown list and counter badge across all browser tabs without manual refresh.

## [0.21.0] - 2026-09-25

### Added
- **Centralized Database Migration & Real-Time Bidirectional Synchronization**:
  - **Database Schemas & Data Migration**:
    - Designed structured document & relational schemas (`StationDocument`, `EquipmentDocument`, `TicketDocument`, `RmaDocument`, `TransactionLogDocument`) in `src/types/database.ts`.
    - Implemented high-performance migration script (`scripts/migrate_and_seed.mjs`) with `bulkWrite` indexing, foreign key linking, and audit logging into `caim.stations` (197 stations), `caim.equipments` & `caim.assets` (644 equipments), `caim.tickets`, `caim.rma`, and `caim.transaction_logs`.
  - **Full CRUD & Transactional Mutation Pipeline**:
    - `/api/stations`: Added full CRUD endpoints (`GET`, `POST`, `PUT`, `DELETE`) with transaction log recording and real-time event broadcasting.
    - `/api/equipments` & `/api/assets`: Added full CRUD endpoints with foreign key validation (`stationId`), transaction logging, and real-time events.
    - `/api/tickets`: Refactored opening new claims ('เปิดเคสใหม่') to validate equipment serial and station references, transition equipment state to `in_claim`, and record `CLAIM_OPENED` in transaction logs.
    - `/api/rma`: Refactored overseas RMA dispatch ('เปิดใบส่งซ่อม') to reference equipment and claim records, transition equipment state to `in_rma`, and record `RMA_DISPATCHED` in transaction logs.
  - **Unified Real-Time Web Synchronization Engine**:
    - Created unified SSE streaming endpoint `/api/realtime/stream` broadcasting `station`, `equipment`, `ticket`, `rma`, and recalculating `metrics`.
    - Created centralized frontend real-time hook `useRealtimeSync` with automatic reconnection, visibility/focus revalidation, and optimistic state updates.
    - Updated `StationsView` with live DB data and full CRUD modals (Add, Edit, Delete station) without requiring page reload.
    - Updated `AssetsView` with live DB data and full CRUD modals (Add, Edit, Delete equipment).
    - Upgraded `NewTicketView` with live DB equipment lookup and cascaded station selection (Province -> District -> Station).
    - Upgraded `TicketsView` with dynamic cascading location dropdowns from live stations DB and real-time ticket synchronization.
    - Upgraded `OverseasView` with live DB case & equipment options, transactional RMA creation, and real-time sync.

## [0.20.0] - 2026-09-24

### Added
- **Equipment Information Data Persistence & MongoDB Atlas Backend Integration**:
  - Implemented `/api/assets` REST endpoint with `GET`, `POST`, `PUT`, and `DELETE` handlers connecting to MongoDB Atlas `caim.assets` collection.
  - Added full search, category/vendor filter, and pagination support with graceful local in-memory fallback.
  - Added dual-layer persistence in `@/lib/storage/recordStorage` (`CUSTOM_ASSETS` in `localStorage` + MongoDB Atlas API).
  - Integrated `AssetsView` modal form with `saveAssetApi`, client validation, submit loading state, and toast feedback.
  - Added manual data refresh button (`RotateCcw`) and automated revalidation on component mount and device creation.
  - Seeded initial equipment database (644 records) into MongoDB Atlas cluster with unique serial indexing via `scripts/seed_mongodb.mjs`.

## [0.19.0] - 2026-09-24

### Added
- **Real-Time Data Synchronization Architecture for Claim Dashboard**:
  - Implemented Server-Sent Events (SSE) stream endpoint `/api/dashboard/stream` broadcasting live ticket changes directly to client sessions.
  - Implemented Pub/Sub Event Emitter singleton `@/lib/events/dashboardEmitter` notifying connected clients on ticket mutations (create, update, delete).
  - Built comprehensive, pure-function KPI and metric calculation engine `@/lib/dashboard/calculateMetrics`.
  - Added REST stats endpoint `/api/dashboard/stats` for SWR and manual revalidation fallback.
  - Built custom React hook `useRealtimeDashboard` with automatic fallback polling (8s), tab visibility/focus revalidation, and optimistic local storage synchronization.
  - Refactored `DashboardView` with live-synced widget metrics across all 4 key areas:
    - Top Summary Cards (Total, In Progress, Closed, Rejected with dynamic progress bar percentages).
    - Performance KPIs (Median pending age, Overdue cases, Closed on time, Median resolution days).
    - Work Status Breakdown (6 stages with animated width bars) & Weekly incoming volume trend.
    - Process Bottlenecks & Service Center Statistics table.
  - Added live status pill indicator with pulse animation and manual refresh trigger.

### Added
- **Live Database Connection & Data Seeding in MongoDB Atlas**:
  - Connected Next.js app to MongoDB Atlas cluster `slr.b6ih1xk.mongodb.net` using database user `darkwer01_db_user`.
  - Created and seeded `caim.tickets` with claim records and lookup indexes (`id`, `serialNo`, `status`, `province`).
  - Created and seeded `caim.stations` with 197 registered station records from Excel data with indexing.
  - Added secure automated seeding script `scripts/seed_mongodb.mjs` resolving credentials dynamically from environment.

### Added
- **MongoDB Atlas Backend Database Infrastructure & Dual-Layer Persistence**:
  - Configured `@/lib/mongodb` client pool manager for Next.js with connection caching.
  - Added `.env.example` and `.env.local` templates for MongoDB Atlas cluster connection string.
  - Enhanced `/api/tickets` route handler with `GET`, `POST`, `PUT`, and `DELETE` operations connecting to MongoDB Atlas `tickets` collection with graceful offline fallback.
  - Enhanced `/api/rma` route handler with `GET`, `POST`, and `DELETE` operations connecting to MongoDB Atlas `rma` collection.
  - Upgraded New Ticket Creation module (`NewTicketView`) with full controlled state binding, automated ID generation, and immediate dual-layer persistence (localStorage + MongoDB Atlas API).
  - Synchronized custom tickets into Claim List (`TicketsView`) on mount, ensuring newly created records persist and remain visible across page reloads.

### Added
- **Permanent Record Deletion & Full Persistence Architecture**:
  - Implemented `/api/tickets` and `/api/rma` backend route handlers for HTTP `DELETE` requests.
  - Added `recordStorage` utility to persist deleted ticket and RMA IDs across page reloads via `localStorage` synchronization.
  - Added dedicated custom confirmation modal dialogs with risk warnings before executing deletions.
  - Integrated real-time UI feedback toasts notifying users upon successful database and local deletion.
  - Added row deletion trigger (`ลบ` action button with `Trash2` icon) to the Claim List module.

### Fixed
- **Filter Reset & Empty Table State Behavior**:
  - Fixed 'ล้างตัวกรอง' (Clear Filter) in both Claim List (`TicketsView`) and RMA (`OverseasView`) modules to reset all input fields and dropdowns back to their default empty states.
  - Implemented an **Empty Table State** upon clearing filters — clearing all rendered rows completely without reloading or displaying the default list until the user manually clicks 'ค้นหา' (Search).
  - Added clean empty table state placeholders with search call-to-action buttons.

## [0.16.0] - 2026-09-24

### Added
- **Cascading Location & Station Hierarchy Filters in Claim List (`รายการงานเคลม`)**:
  - Populated Province (`จังหวัด`), District (`อำเภอ`), Sub-district (`ตำบล`), and Station (`สถานี`) dropdown filters directly from registered records in the Station Information (`STATIONS`) database:
    - **Province (`จังหวัด`)**: Distinct registered provinces sorted in Thai alphabetical order.
    - **District (`อำเภอ`)**: Cascades dynamically from selected province (disabled with `"เลือกจังหวัดก่อน"` when no province is chosen); resets when province changes.
    - **Sub-district (`ตำบล`)**: Cascades dynamically from selected district (disabled with placeholder `"เลือกอำเภอก่อน"` when no district is chosen); resets when district changes.
    - **Station Linking (`สถานี`)**: Filters and groups stations matching the full selected hierarchy (Province > District > Sub-district), organized by 60m main stations and repeater masts.
  - **State Management & Query Logic**:
    - Full cascading handlers with synchronized reset triggers.
    - Exported `buildClaimFiltersQuery` URL query builder for API integration and client bookmark sync.
    - Clear/Reset filters button with icon and reactive search result counter badge.
    - Enriched table rows and detail modal with station installation and administrative boundary indicators.

## [0.15.0] - 2026-09-24

### Added
- **Create Overseas RMA / Dispatch Modal Dialog**:
  - Interactive modal dialog for creating overseas RMA claims with equipment selection and case linking.

## [0.14.0] - 2026-09-24

### Added
- **Station Management (`ข้อมูลสถานี`) Full Database Import**:
  - Integrated 197 station sites from Excel dataset with multi-criteria filtering and detail viewer.

## [0.13.0] - 2026-09-23

### Added
- **Create New Claim (`เปิดเคสใหม่`) Form Layout & Dynamic Summary Widget (1:1 Reference Replication)**:
  - Rebuilt `/tickets/new` view strictly matching the reference screenshot:
    - **Header**: Breadcrumbs (`[Home Icon] > งานเคลม > เปิดเคสใหม่`), dark navy badge (`#0c1a30`) with white add-file icon, title `เปิดเคสใหม่`, and subtitle `กรอกเลขที่เคลมเองในฟอร์มด้านล่าง`.
    - **Sidebar Navigation**: Fixed `isItemActive` in `AppShell` so visiting `/tickets/new` highlights ONLY `แจ้งเคลม`.
    - **Two-Column Card Layout**:
      - **Left Column (Claim Input Form)**:
        - `อุปกรณ์`: Dropdown select for registered devices (`เลือกอุปกรณ์จากทะเบียน ⬍`).
        - `ข้อมูลเคส`: `เลขที่เคลม` input with duplicate validation note, `วันและเวลาที่รับแจ้ง` datetime input, `สถานะการรับประกัน` dropdown, and `อาการเสีย / ปัญหาที่พบ` textarea.
        - `กำหนดการและศูนย์บริการ`: `ศูนย์บริการ / ผู้รับงาน` dropdown, `วันและเวลาที่ส่งศูนย์บริการ` datetime input, and `กำหนดแล้วเสร็จ` input with auto-fill helper note.
        - `ผู้เกี่ยวข้อง`: `ผู้แจ้ง / เจ้าของเครื่อง` input, `ผู้รับผิดชอบเคส` input, and `หมายเหตุ` textarea.
      - **Right Column (Sidebar Summary Card)**:
        - Circular countdown widget: Blue ring with `60 / วัน`, `เหลืออีก 60 วัน`, and `ครบกำหนด 22 พ.ย. 2569`.
        - Live case summary (`สรุปเคส`): Real-time reflection of entered `เลขที่เคส` and selected `อุปกรณ์ที่เลือก`.
        - Full-width dark navy submit button (`เปิดเคส`) and secondary outline cancel button (`ยกเลิก`).

## [0.12.0] - 2026-09-23

### Added
- **Overseas Claim Management & Stage Tracking Stepper Modal (1:1 Reference Replication)**:
  - Rebuilt `/repairs/overseas` view strictly matching the reference screenshots:
    - **Header**: Airplane icon in navy badge (`#0c1a30`), breadcrumbs, page title `ส่งเคลมต่างประเทศ`, subtitle, and `+ เปิดใบส่งซ่อม` action button.
    - **Filter Card**: `ค้นหา` input, `ขั้นตอน` dropdown, `สถานะใบ` dropdown, `ศูนย์บริการ` dropdown, `เฉพาะที่เกินบทปรับ` toggle button, and aligned dark `ค้นหา` button.
    - **RMA Data Table**:
      - Columns: `ใบ RMA / เคส`, `อุปกรณ์`, `ขั้นตอนปัจจุบัน`, `เปิดใบ`, `รวม`, `บทปรับผู้ขาย`, and Action buttons (`ไทม์ไลน์`, `แก้ไข`, `ลบ`).
      - Segmented 8-stage progress indicators (`5/8` with green and blue dashes, `8/8` with full green dashes).
      - Status badges (`กำลังดำเนินการ` and `ของกลับถึงแล้ว`).
      - Row alert highlight for overdue vendor penalties (`test14` highlighted in soft red `bg-[#fff5f5]` with bold red `เกิน 7 วัน`).
    - **Timeline Tracking Modal (ใบ TEST20)**:
      - Modal header with RMA number, S/N, case name, and vendor.
      - 8-stage vertical stepper timeline with connecting lines:
        - Steps 1-5: Completed with green checkmarks, dates, and days elapsed (with exceeded days `(8 วัน)` and `(4 วัน)` in orange/red).
        - Step 6 (Active): Highlighted with blue circle `6` badge, `จีน (เข้ากระบวนการซ่อม)`, and tag `⏰ เริ่มนับบทปรับผู้ขาย`.
        - Steps 7-8: Pending steps in grey (`ส่งกลับเครื่องบิน`, `เคลียร์ของออก (ศุลกากรขาเข้า)`).
      - Footer actions: Summary text of total elapsed days vs standard plan, timestamp input (`วันและเวลาที่เกิดขึ้นจริง`), primary transition button (`› ปิดขั้น "จีน — ซ่อม" → เข้าขั้น "ขนส่งกลับ"`), and secondary action (`✎ แก้ไขที่รายขั้น (กรอกย้อนหลัง)`).
    - **New RMA Dispatch Modal**: Modal form for creating a new RMA record with validation and instant feedback.
    - **Edit RMA Modal**: Modal form for in-place editing of RMA details.

## [0.11.0] - 2026-09-23

### Added
- **Claim List & Multi-Column Filter UI (1:1 Reference Replication)**:
  - Rebuilt `/tickets` view strictly matching the reference screenshot:
    - **Header**: Navy badge (`#0c1a30`) with white clipboard icon, page title `รายการงานเคลม`, and subtitle `ทุกเคสเคลมที่บันทึกไว้ เลือกเงื่อนไขในการ์ดค้นหาแล้วกดค้นหา`.
    - **Multi-Column Filter Card**:
      - Row 1: `สถานะ` (Status dropdown), `เลขที่เคส` (Case No input), `S/N` (input with placeholder `หมายเลขเครื่อง`), `หมวดหมู่` (Category dropdown), `ศูนย์บริการ` (Service Center dropdown).
      - Row 2: `จังหวัด` (Province dropdown), `อำเภอ` (District dropdown), `ตำบล` (Subdistrict dropdown), `สถานี` (Station dropdown), `เฉพาะที่เกินกำหนด` (Overdue toggle filter button).
      - Row 3: Aligned dark navy `ค้นหา` action button with search icon.
    - **Data Table**:
      - Selectable rows with circular checkbox column (select-all and row selection).
      - Columns: Checkbox, `เคส`, `อุปกรณ์` (with microchip icon badge), `สถานะ` (color-coded pill badges), `รับแจ้ง` (date), `อายุงาน` (duration), and `Action` (`ดู / แก้ไข` links).
      - Alert highlight for overdue row (`FORTH-2026-002`): soft red background `bg-[#fff5f5]`, red duration `13 วัน`, and warning badge `⚠ เกินกำหนด 8 วัน`.
      - Interactive modal integration for viewing and in-place editing of tickets.
    - **Pagination & Footer**:
      - Rows per page selector (`10 รายการ/หน้า ⌵`).
      - Total records summary text (`แสดง 1–5 จาก 5 เคส`).
      - Page navigation controls (`< ก่อนหน้า`, `หน้า 1/1`, `ถัดไป >`).

## [0.10.0] - 2026-09-23

### Added
- **Equipment Claim Dashboard UI (1:1 Reference Replication)**:
  - Rebuilt `/dashboard` view strictly according to reference screenshots (`image_3.png`, `image_4.png`, `image_5.png`):
    - **Header**: Breadcrumb (`[Home Icon] > แดชบอร์ด`), navy badge with white clock icon, title `ภาพรวมงานเคลมอุปกรณ์`, and subtitle `สรุปสถานะการเคลมอุปกรณ์โครงข่ายวิทยุสื่อสาร`.
    - **Top Summary Cards**: 4 cards with exact color-coding and icons:
      - `เคสทั้งหมด` (Total: 5, soft blue, clipboard icon, `รวมทุกสถานะในระบบ`)
      - `อยู่ระหว่างดำเนินการ` (In Progress: 3, amber, radiant sun icon, 60% progress bar, `60% ของเคสทั้งหมด`)
      - `เคลมสำเร็จ / ปิดเคส` (Closed: 1, soft green, check circle icon, 20% progress bar, `20% ของเคสทั้งหมด`)
      - `ปฏิเสธเคลม` (Rejected: 1, soft pink, ban icon, 20% progress bar, `20% ของเคสทั้งหมด`)
    - **Core Performance Widgets**: `ตัวชี้วัดการทำงาน` with 4 metric cards:
      - `อายุงานค้างกลาง`: 13 วัน n=3 with hourglass icon
      - `เกินกำหนด`: 1 in bold red with alarm clock icon in alert badge
      - `ปิดทันกำหนด`: — with calendar check icon
      - `เวลาปิดงานกลาง`: 19 วัน n=1 with timer icon
    - **Work Status Widget (`สถานะงาน`)**: 6 stages with color-coded horizontal bars and counters (`รับแจ้ง/รอตรวจสภาพ`, `ส่งศูนย์บริการแล้ว`, `รออะไหล่/กำลังซ่อม`, `ซ่อมเสร็จ/รอส่งมอบ`, `ปิดเคส (รับคืนเรียบร้อย)`, `ปฏิเสธเคลม (นอกเงื่อนไข)`).
    - **Weekly Overview Widget (`ภาพรวมรายสัปดาห์`)**: Main metric `0`, trend `-100%` with downward trend icon, weekday calendar labels (`พฤ. ศ. ส. อา. จ. อ. พ.`), and 3 summary stat boxes (`รับแจ้ง`, `ซ่อมเสร็จ รอส่งมอบ`, `ปิดเคส`).
    - **Process Bottlenecks Widget (`คอขวดของกระบวนการ`)**: 4 stages with `จบแล้ว` and `ค้างอยู่` dual progress bars and exact day metrics.
    - **Service Center Statistics Table (`ระยะเวลาที่งานอยู่กับศูนย์บริการ`)**: Metrics for `Huawei`, `Hytera`, and `ยังไม่ระบุศูนย์` with case counts, time at center, overdue, and longest delay.

## [0.9.0] - 2026-09-23

### Added
- **Claim Detail Page (`/tickets/[id]`)**:
  - Implemented 1:1 pixel-perfect Claim Detail UI based on the reference design:
    - **Header & Summary Cards**: Breadcrumbs (`Home > งานเคลม > หัวข้อเลขที่เคลม`), clipboard icon header with case title & subtitle, and 2 top stat cards (`อายุงาน: 10 วัน`, `สถานะประกัน: อยู่ในประกัน`)
    - **Main Status Tracker**: 5-stage horizontal lifecycle stepper (1: รับแจ้ง, 2: ส่งศูนย์, 3: รออะไหล่, 4: รอส่งมอบ, 5: ปิดเคส) with active stage badges and interactive action buttons (`แก้ไข` and `เปลี่ยนสถานะ`)
    - **Left Column**: Issue description (`อาการเสีย / ปัญหาที่พบ`), repair notes (`ผลการซ่อม / การแก้ไข`), remarks (`หมายเหตุ`), vertical timeline events (`ลำดับเหตุการณ์`), and device case history list (`ประวัติเคสอื่นของอุปกรณ์ชิ้นนี้`)
    - **Right Column (Sidebar Widgets)**: Circular progress countdown card showing remaining days (`กำหนดแล้วเสร็จ: เหลืออีก 50 วัน`), hardware specs detail list (`อุปกรณ์`), and case metadata key-value list (`ข้อมูลเคส`)
    - **Interactive Modals**: In-place edit modal for claim details and change status modal that appends timeline milestones dynamically
  - Linked table action "ดู" and ticket titles from `/tickets` to navigate directly to the detail view

## [0.8.2] - 2026-09-23

### Fixed
- **Tickets View / Edit Action Link**:
  - Implemented responsive click handlers for "ดู" (View) and "แก้ไข" (Edit) action buttons in the claims table (`TicketsView`)
  - Added interactive Claim Details Modal (`View Mode`) showing ticket title, problem description, equipment details, status badges, and SLA age
  - Added interactive Claim Edit Form (`Edit Mode`) allowing in-place updating of claim title, problem description, vendor, model, serial number, and status code with persistent state synchronization
  - Added status badge mappings for statuses 3 (รออะไหล่) and 4 (ซ่อมเสร็จ) in the claims table

## [0.8.1] - 2026-09-23

### Performance & Optimization
- **Image Payload Optimization**:
  - Re-encoded hero background image from uncompressed 5.36MB PNG to sharp high-res 2048px WebP (`IMG_8154_enhanced_2x.webp`) at 256KB (**95.2% size reduction**)
  - Enabled Next.js modern image formats (`image/avif`, `image/webp`) with long-term cache TTL
- **Persistent AppShell & Zero-Flicker Layout**:
  - Unified all authenticated pages (`/dashboard`, `/tickets`, `/tickets/new`, `/stations`, `/manual`, `/assets`, `/repairs/overseas`) under `(authenticated)` route group with shared `layout.tsx`
  - Completely eliminated unmount/remount layout thrashing and sidebar DOM reconstruction during page navigation
- **Rendering & Concurrency Optimization**:
  - Implemented `React.useDeferredValue` and `React.useMemo` for search filters in `StationsView`, `TicketsView`, and `AssetsView` to ensure 60fps responsive input with zero UI freezing
  - Hoisted static dataset allocations (`STATIONS`, `ASSETS`, `NAV_SECTIONS`) outside component bodies to eliminate repetitive memory allocation on re-render
- **Font & Asset Delivery**:
  - Pruned unused `Sarabun` 300 font weight from initial download pipeline, enabling `preload` and `display: "swap"`
- **Next.js & Turbopack Compiler**:
  - Added `compress: true`, `poweredByHeader: false`, and `optimizePackageImports` for `lucide-react`, `@base-ui/react`, `clsx`, `tailwind-merge` (build time reduced by 74%)

## [0.8.0] - 2026-09-22

### Added
- Complete reverse-engineered internal authenticated pages from `https://equipment-claims.vercel.app/`:
  - Shared navigation shell (`AppShell`) with collapsible sidebar, active route indicators, user profile display, and mobile responsive drawer
  - Dashboard (`/dashboard`) with real KPI metrics, status cards, 7-day weekly overview, and vendor performance table
  - Claims Tickets list (`/tickets`) with interactive search, tab filters, pagination, and status badges
  - New Claim creation form (`/tickets/new`) with multi-step fields, warranty status, vendor selection, and deadline estimation
  - Overseas RMA tracking (`/repairs/overseas`) with international shipment status and search
  - Equipment Asset registry (`/assets`) with category chips, serial numbers, and maintenance history
  - Base Station directory (`/stations`) covering 50+ nationwide radio stations and regional filter
  - Staff user manual (`/manual`) with system guidelines, warranty SLA workflows, and export notes
- Login credential support for provided account `indykantanat@gmail.com` with quick auto-fill helper

## [0.7.0] - 2026-09-22

### Added
- Demo authentication credentials (`admin@forth.co.th` / `123456`) with 1-click auto-fill helper
- Equipment Claims Dashboard (`/dashboard`) featuring summary stats, ticket search, status filters, claim details modal, and new claim creation dialog
- Navigation flow between Login and Dashboard with session routing

## [0.6.0] - 2026-09-22

### Added
- Cloned Equipment Claims (ระบบบริหารงานเคลมอุปกรณ์) login page from `https://equipment-claims.vercel.app/`
- Custom design tokens, IBM Plex Sans and Sarabun fonts, and Forth Corporation brand assets
- LoginForm component with responsive layout and interactive demo validation

### Security
- Update Next.js and eslint-config-next to 16.3.5 with exact version pins, and refresh vulnerable transitive dependencies. Thanks to @atahan150 for the report in [#117](https://github.com/JCodesMore/ai-website-cloner-template/issues/117) and proposed fix in [#118](https://github.com/JCodesMore/ai-website-cloner-template/pull/118).

## [0.5.0] - 2026-09-17

### Added
- Repository ranking badges in the README

### Changed
- Simplified Quick Start with a copyable agent setup prompt, a template button, and one cloning command example
- Consolidated Claude Code, Codex, Cursor, and OpenCode support around one canonical Agent Skill in `.agents/skills/clone-website/`
- Reduced the Claude Code integration to a thin command bridge that forwards arguments to the canonical skill without creating a duplicate skill in other agents
- Moved the website inspection guide into the canonical skill's on-demand references

### Removed
- Expired sponsor integrations
- Japanese and Simplified Chinese READMEs; the English README is the single maintained entry point
- Redundant workflow diagrams from the READMEs
- Generated skill and instruction copies for unsupported or redundant agent platforms
- The agent-rule and skill synchronization scripts and their generated-file CI gate

## [0.4.0] - 2026-08-10

### Added
- Docker workflows for local development and multi-stage production builds
- Kiro support through a generated workspace `/clone-website` skill
- Complete generated workspace skills for Cline and Roo Code, including a Roo slash-command bridge
- Simplified Chinese and Japanese READMEs with the same onboarding and workflow guidance as the English documentation
- Contributor and security policies, including a private vulnerability-reporting path
- CI enforcement that generated agent rules and skills remain synchronized with their source files
- Compact pipeline diagrams and a static Star History chart in every README

### Changed
- Raised the project Node.js baseline to 24 across local development, CI, Docker, and contributor-facing documentation
- Refreshed Next.js to 16.3, React to 19.2.4, and related dependencies
- Updated `/clone-website` so later runs preserve existing pages and isolate routes, research, components, assets, and downloaders for each target
- Improved multi-origin and query/fragment planning with collision-resistant output namespaces and explicit route verification
- Redesigned README onboarding around the template workflow, Opus 5 recommendation, supported platforms, and community links
- Hardened the rule and skill generators for current platform schemas and deterministic output

### Fixed
- Gemini CLI command validation by adding the required name and flattening the prompt schema
- Cline and Roo Code invocation, frontmatter, and argument handling
- Next.js documentation resolution in generated agent rules
- Vulnerable framework dependencies and generated-file consistency checks

### Removed
- Aider from the officially supported-platform list because its current capabilities cannot run the complete browser and subagent workflow reliably; `.aider.conf.yml` remains available for loading general project context

### Security
- Documented responsible vulnerability disclosure through GitHub private vulnerability reporting
- Updated vulnerable dependencies to patched releases

## [0.3.1] - 2026-03-29

### Fixed
- `sync-agent-rules.sh` failing to resolve `@file` imports on Windows due to CRLF line endings — platform instruction files now correctly inline the Inspection Guide content

## [0.3.0] - 2026-03-29

### Added
- Multi-URL support for `/clone-website` — clone multiple sites in a single command with parallel processing and isolated output
- CI quality gates via GitHub Actions — automated lint, typecheck, and build on every push and PR
- `npm run typecheck` and `npm run check` scripts for local quality validation
- `.gitattributes` for cross-platform line ending normalization
- `.nvmrc` to pin Node.js 20 for contributor consistency

### Changed
- Streamlined PR template — removed redundant checklist items and screenshots section
- Improved project description and README — clearer use cases, limitations, and modern wording
- Refined documentation and agent rules across all platforms for clarity and consistency
- Fixed CRLF handling in `sync-skills.mjs` for reliable Windows operation

### Removed
- Outdated use case from README documentation

## [0.2.0] - 2026-03-28

### Added
- Multi-platform AI agent support: Claude Code, Codex CLI, OpenCode, GitHub Copilot, Cursor, Windsurf, Gemini CLI, Cline/Roo Code, Continue, Amazon Q, Augment Code, Aider
- Platform-specific instruction files and `/clone-website` skill for each supported agent
- `scripts/sync-agent-rules.sh` to regenerate platform instruction files from AGENTS.md
- `scripts/sync-skills.mjs` to regenerate `/clone-website` skill across all platforms
- GEMINI.md for Gemini CLI configuration
- Supported Platforms table in README
- "Updating for Other Platforms" documentation section in README

### Changed
- README now describes the project as multi-agent (Claude Code recommended, not required)
- AGENTS.md updated with sync script reminders

## [0.1.1] - 2026-03-28

### Added
- Bug report and feature request issue templates
- Pull request template with checklist
- CHANGELOG.md following Keep a Changelog format
- Package.json metadata (description, repository, homepage, keywords, engines)

### Fixed
- LICENSE copyright holder now attributed to JCodesMore

## [0.1.0] - 2026-03-28

### Added
- Initial template scaffold for website reverse-engineering with Claude Code
- `/clone-website` skill for full-site cloning pipeline
- `/build-from-spec` and `/customize` skills
- Parallel builder agents with git worktree isolation
- Chrome MCP integration for design token extraction
- Comprehensive inspection guide and project structure documentation
- Next.js 16 + shadcn/ui + Tailwind CSS v4 base scaffold
- MIT license
- README with badges, demo section, quick start, and star history

[Unreleased]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/JCodesMore/ai-website-cloner-template/releases/tag/v0.1.0
