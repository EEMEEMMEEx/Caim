---
name: ux-ui-pro-max
description: Comprehensive expert UX/UI design system and heuristics skill. Enforces enterprise visual hierarchy, modern micro-interactions, responsive layout standards, dark/light theme harmony, WCAG accessibility, and premium UI engineering across all React/Next.js components.
---

# UX/UI Pro Max Design System & Engineering Guidelines

This skill provides an authoritative, enterprise-grade UX/UI standard for all frontend components, layouts, pages, and interactive workflows.

---

## 1. Core Design Philosophy

- **Visual Excellence & Wow Factor**: Every interface must feel premium, modern, and intentional. Avoid flat, amateur, or basic default aesthetics.
- **Surface Elevation & Depth**: Employ layered elevation rather than stark flat surfaces.
  - Root Canvas: `#f8fafc` (Light) / `#0b0f19` (Dark)
  - Navigation / Sidebar: `#ffffff` / `#0f172a`
  - Cards & Content Containers: `#ffffff` / `#1e293b`
  - Floating Panels & Modals: Glassmorphism with `backdrop-blur-md bg-white/80` or `dark:bg-[#0f172a]/85`
- **Subtle Boundaries**: Replace harsh borders with ultra-fine, translucent borders (`border-slate-200/70` in Light, `border-white/10` in Dark).
- **Zero Emoji in UI**: Never use Unicode emoji as system icons. Use crisp scalable SVG icons (Lucide React or ReactBits SVG) with consistent size (`size-4` / `size-5`) and stroke width.

---

## 2. Color Palette & Dark/Light Theme Tokens

| Token Role | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| **Canvas** | `bg-slate-100/60` or `bg-[#f8fafc]` | `dark:bg-[#0b0f19]` | Root application backdrop |
| **Surface (Card)** | `bg-white/95` | `dark:bg-[#1e293b]` | Dashboard cards, data tables, containers |
| **Surface (Nav)** | `bg-white/90` | `dark:bg-[#0f172a]` | Left sidebar, top navigation header |
| **Border (Subtle)** | `border-slate-200/70` | `dark:border-white/10` | Card borders, dividers, table lines |
| **Text Primary** | `text-slate-800` | `dark:text-slate-100` | Headings, primary metrics, titles |
| **Text Muted** | `text-slate-500` | `dark:text-slate-400` | Subtitles, labels, metadata, timestamps |
| **Brand Accent** | `text-blue-600` / `bg-blue-600` | `dark:text-sky-300` / `dark:bg-blue-500` | CTAs, active nav items, key indicators |

### Status Pill Badges (Accessible Pastel & Ring Architecture)
- **Active / Success**: `bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600/20 dark:ring-emerald-500/30`
- **Pending / In Progress**: `bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-600/20 dark:ring-blue-500/30`
- **Waiting / Spare Parts**: `bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-1 ring-amber-600/20 dark:ring-amber-500/30`
- **Overdue / Critical**: `bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-1 ring-rose-600/20 dark:ring-rose-500/30`
- **Completed / Closed**: `bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-1 ring-slate-600/15 dark:ring-white/10`

---

## 3. Micro-Interactions & Tactile Feedback

- **Hover Lift**: Interactive cards should have a subtle upward translate on hover:
  ```css
  hover:-translate-y-1 hover:shadow-card-hover transition-all duration-200
  ```
- **Active Click Compression**: Buttons and clickable tiles should give tactile click feedback:
  ```css
  active:scale-[0.98] transition-transform duration-100
  ```
- **Focus Rings**:
  ```css
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1
  ```
- **Live Pulse Nodes**: For real-time sync or active statuses, use a two-tier pulse:
  ```tsx
  <span className="relative flex size-2">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
  </span>
  ```

---

## 4. Typography & Information Hierarchy

- **Font Stacks**: Use clean modern sans-serif fonts:
  - English: `Geist`, `Inter`, `system-ui`
  - Thai: `Sarabun`, `IBM Plex Sans Thai`
- **Metric Scale**:
  - Hero Value: `text-2xl` to `text-3xl font-bold tracking-tight`
  - Section Title: `text-base` to `text-lg font-semibold text-slate-900 dark:text-slate-100`
  - Data Header: `text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400`
  - Table Cell Text: `text-xs font-medium`

---

## 5. Table & Data Density Patterns

1. **Table Container**: `rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#1e293b] backdrop-blur-xs shadow-card overflow-hidden`
2. **Table Header (`thead`)**: `bg-slate-50/90 dark:bg-[#0f172a] text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200/70 dark:border-white/10`
3. **Table Row (`tr`)**: `hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors duration-150`
4. **Pagination Bar**: Stick to the bottom of the table container with clear item count, rows-per-page selector, and responsive page navigation buttons.

---

## 6. Accessibility & WCAG Compliance Checklist

- [x] Color contrast ratio >= 4.5:1 for normal text and >= 3:1 for large text/icons.
- [x] Non-color indicators: status is never conveyed by color alone (always include label text or distinct icon mark).
- [x] All interactive buttons and icon-only triggers have descriptive `aria-label` and `title`.
- [x] Keyboard navigability: all inputs, selects, and action items have clean focus rings.
- [x] Screen reader announcements for loading, search results, and filter reset operations.
