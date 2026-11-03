# Design Tokens & System Specification — Kashef

Extracted directly and strictly from:
1. **`ehc-obgyn-guidelines`** (`index.html`, `styles.css`, `manifest.json`)
2. **`AIFV`** (`src/components/app-shell.tsx`, `brand-mark.tsx`, `page-header.tsx`, `src/hooks/use-theme.ts`, `src/styles.css`, `public/site.webmanifest`)
3. **`AIPICO`** (`style.css`, `index.html`)

---

## 1. Color Tokens (Light & Dark)

### 1.1 Primary & Theme Colors (from EHC & AIFV)
* **Theme Primary (Light)**: `#1a5c8a` (EHC theme color / deep medical blue; AIFV `oklch(0.45 0.13 253)`)
* **Primary Dark / Hover (Light)**: `#144a70`
* **Primary Soft / Light (Light)**: `#e8f1f8` (AIFV `oklch(0.95 0.024 250)`)
* **Theme Primary (Dark)**: `#4da8da` (EHC dark mode; AIFV `oklch(0.68 0.14 250)`)
* **Primary Dark / Hover (Dark)**: `#3a9bd8`
* **Primary Soft (Dark)**: `#1e3a4d` (AIFV `oklch(0.3 0.06 253)`)

### 1.2 Surface & Neutral Tokens
| Role | Light Mode (`ehc` / `AIFV`) | Dark Mode (`ehc` / `AIFV`) |
| :--- | :--- | :--- |
| **Page Background** | `#fafbfc` / `oklch(0.976 0.003 247.9)` | `#0f1720` / `oklch(0.19 0.025 258)` |
| **Card / Surface** | `#ffffff` / `oklch(1 0 0)` | `#172030` / `oklch(0.235 0.028 258)` |
| **Text (Foreground)**| `#1d2328` / `oklch(0.22 0.035 258)` | `#e8edf2` / `oklch(0.965 0.006 250)` |
| **Muted Text** | `#5a6a78` / `oklch(0.53 0.03 255)` | `#8b9cb3` / `oklch(0.72 0.025 255)` |
| **Borders** | `#e1e8ed` / `oklch(0.915 0.008 255)` | `#2a3d4f` / `oklch(1 0 0 / 11%)` |
| **Focus Ring** | `#1a5c8a` / `oklch(0.45 0.13 253)` | `#4da8da` / `oklch(0.68 0.14 250)` |

### 1.3 Semantic Signals & Severity Tokens
| Status | Light Mode | Dark Mode | Usage in Kashef |
| :--- | :--- | :--- | :--- |
| **Human / Verified** | Text: `#1e7d46`, Bg: `#e6f5ec`, Border: `#a7f3d0` | Text: `#6fd69a`, Bg: `#1d3a2c` | Likely human-authored paragraphs |
| **Warning / Mixed** | Text: `#7a5a10`, Bg: `#fcf2d0`, Border: `#fde68a` | Text: `#f2d77c`, Bg: `#45371a` | Mixed / uncertain AI indicators |
| **High AI / Alert** | Text: `#b45309`, Bg: `#fef3c7`, Soft: `#960585` | Text: `#e8c547`, Bg: `#3d361a` | High AI probability paragraphs |
| **Destructive / Error**| Text: `#dc2626`, Bg: `#fef2f2`, Soft: `oklch(0.96 0.03 22)` | Text: `oklch(0.68 0.16 22)`, Bg: `oklch(0.32 0.07 22)` | Format / validation failures |

---

## 2. Typography

* **Body / UI Sans Font Family**:
  * `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (exact font in EHC guidelines and AIFV `--font-sans`)
* **Display / Headings Font Family**:
  * `"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif` (AIFV `--font-display`)
* **Type Scale & Weights**:
  * **Page Title (`h1`)**: `1.5rem` – `1.875rem` (`24px`–`30px`), `font-weight: 700`, `letter-spacing: -0.02em`
  * **Section Headings (`h2`)**: `1.25rem` (`20px`), `font-weight: 600`, `letter-spacing: -0.02em`
  * **Card Headings (`h3`)**: `1.0rem` – `1.125rem` (`16px`–`18px`), `font-weight: 600`
  * **Eyebrow / Step Labels**: `0.6875rem` (`11px`), `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.16em`
  * **Body Text**: `0.875rem` – `1.0rem` (`14px`–`16px`), `line-height: 1.6`
  * **Source Links / Subtitles**: `0.8125rem` (`13px`), `line-height: 1.4`

---

## 3. Border Radius, Shadows & Spacing

### Border Radius (from EHC & AIFV)
* **Small (`--radius-sm`)**: `6px` (chips, inline code, badges)
* **Medium (`--radius-md`)**: `10px` (inputs, buttons, tab triggers)
* **Large (`--radius-lg` / `--radius`)**: `14.4px` – `16px` (`0.9rem`, cards, dialogs, main panels)
* **Extra Large (`--radius-2xl`)**: `22.4px` (outer surface panels)
* **Pill / Circular**: `999px` (status tags, avatar)

### Shadows
* **Soft (`--shadow-soft` / `--shadow-sm`)**:
  * Light: `0 1px 2px rgba(29,35,40,0.06)` or `0 1px 2px oklch(0.35 0.09 250 / 0.04), 0 8px 24px -12px oklch(0.35 0.09 250 / 0.14)`
  * Dark: `0 1px 2px rgba(0,0,0,0.3)`
* **Lift (`--shadow-lift` / `--shadow-md`)**:
  * Light: `0 4px 12px rgba(29,35,40,0.08)` or `0 2px 4px oklch(0.35 0.09 250 / 0.05), 0 24px 48px -20px oklch(0.35 0.09 250 / 0.22)`
  * Dark: `0 4px 12px rgba(0,0,0,0.4)`

### Spacing & Layout
* **Max Width**: `--max-width: 1100px` (EHC) / `max-w-7xl` (`1280px`, AIFV)
* **Tap Targets**: Minimum `44px` height on interactive elements (`button { touch-action: manipulation; }`)
* **Card Padding**: `22px` – `24px` desktop, `16px` mobile

---

## 4. Header Pattern (from `ehc-obgyn-guidelines`)

Strict 3-zone layout:
1. **Left Side — Logo Link**:
   * Brand mark / icon linking to home (`/`) or suite hub.
   * Class: `.logo-link` with subtle shadow and rounded corner radius.
2. **Center — Short Label**:
   * Compact badge / centered tag (`.header-center`).
   * Example: `"Kashef Engine"` or `"Kashef AI"`.
3. **Right Side — Info Block**:
   * Page Title (`<h1>`): `"Kashef — AI Authorship Estimation"`
   * Source / Subtitle Link (`.source-link`): Link to documentation, methodology, or upstream tool with trailing arrow and screen-reader note:
     ```html
     <p class="source-link">
       <a href="/docs/methodology" target="_blank" rel="noopener">
         Probabilistic Linguistic Signals <span class="visually-hidden">(opens in a new tab)</span>→
       </a>
     </p>
     ```

---

## 5. Footer Pattern (from `ehc-obgyn-guidelines` & `AIFV`)

Strict 3-element stacked footer:
1. **Disclaimer Line**:
   * *"Reference aid — does not replace professional judgement. Results are probabilistic and must never be the sole basis for academic or disciplinary decisions."*
2. **One External Link**:
   * `<a href="https://github.com/roroleaks/kashef" target="_blank" rel="noopener">View source and documentation on GitHub <span class="visually-hidden">(opens in a new tab)</span>→</a>`
3. **Credit Line**:
   * `"Created by Dr. Raouf Roshdy"`

---

## 6. Dark Mode Behavior (from `AIFV` `src/hooks/use-theme.ts`)

* **Storage Key**: `kashef-theme` (matching `ivf-theme` pattern in AIFV).
* **System Sync**: Respects `prefers-color-scheme: dark` by default if no stored key exists.
* **DOM Application**: Synchronizes `.dark` class directly on `document.documentElement`.
* **Controls**: Accessible Sun/Moon icon toggle with explicit `aria-label` (`Switch to light mode` / `Switch to dark mode`).

---

## 7. Accessibility Patterns (WCAG AA)

* **Visually Hidden Utility**:
  ```css
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  ```
* **Live Status Region**:
  * An `aria-live="polite"` element for dynamic analysis state announcements (e.g., "Extracting PDF text layer...", "Analysis complete").
* **Focus Visible**:
  * `outline: 2px solid var(--color-border-focus); outline-offset: 2px;`

---

## 8. PWA Metadata (from `ehc` `manifest.json` & `AIFV` `site.webmanifest`)

* **Theme Color**: `#1a5c8a` (Light) / `#0f1720` (Dark)
* **Background Color**: `#144a70`
* **Display Mode**: `standalone`
* **Orientation**: `portrait-primary`
* **Icons**: `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180x180), `icon-192.png` (maskable), `icon-512.png` (maskable).

---

## 9. Not Found (Explicitly Absent in Inspected Repos)

The following details were **not found** in `ehc-obgyn-guidelines`, `AIFV`, or `AIPICO` and are **not** invented:
1. **Custom Arabic Font Face**: No web font (such as Amiri, Cairo, or Noto Naskh) is declared in these three repos. RTL is supported structurally using HTML `dir="rtl"` with system Arabic fallbacks (`system-ui, -apple-system, Tahoma, Arial`).
2. **Audio/Haptic Feedback**: None declared.
3. **Third-Party Analytics Trackers**: None declared; strict data minimization is maintained.
