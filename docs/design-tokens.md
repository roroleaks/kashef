# Design Tokens & System Specification — Kashef

Extracted directly from existing repositories (`Sysrevai`, `AIMed`, `AIPICO-app`, `roshdy-med-suite`, `preppt`).

---

## 1. Color Tokens

### 1.1 Core Semantic & Surface Colors (Sysrevai / Preppt / AIMed CSS Variables)
| Token Variable | Hex / Value | Role / Usage in Repos |
| :--- | :--- | :--- |
| `--bg` | `#f6f8fa` | Default application background |
| `--card` | `#ffffff` | Elevated surface/card background |
| `--ink` | `#1a2332` | Primary text and heading color |
| `--muted` | `#5a6a7e` | Secondary/subtle text, meta labels, helper captions |
| `--border` | `#d8dee6` | Standard structural borders, card dividers |
| `--border-subtle` | `#edf0f4` | Table borders, subtle component outlines |
| `--bg-subtle` | `#f8fafb` | Tab bars, disabled states, stepper track backgrounds |

### 1.2 Brand & Accent Colors (Teal / Pine Theme)
| Token Variable | Hex / Value | Role / Usage in Repos |
| :--- | :--- | :--- |
| `--accent` | `#0f6b6b` | Primary interactive teal, active states, main brand tone |
| `--accent-hover` | `#0b5555` | Darkened teal for hover/focus interactions |
| `--accent-light` | `#e3f2f2` | Soft teal tint for badge backgrounds, active step highlights |
| `--accent-border` | `#99f6e4` | Highlight border for selected items |
| Header Gradient Start | `#0f6b6b` | Main top navigation header background gradient start |
| Header Gradient End | `#0a4a4a` | Main top navigation header background gradient end (`linear-gradient(135deg, #0f6b6b, #0a4a4a)`) |

### 1.3 Tailwind Brand Palettes (from `roshdy-med-suite` / `AIMed`)
- **Brand (Emerald/Teal)**:
  - `50`: `#ecfdf5`, `100`: `#d1fae5`, `200`: `#a7f3d0`, `300`: `#6ee7b7`, `400`: `#34d399`
  - `500`: `#10b981`, `600`: `#059669`, `700`: `#047857`, `800`: `#065f46`, `900`: `#064e3b`
- **Clinical (Sky/Blue)**:
  - `50`: `#f0f9ff`, `100`: `#e0f2fe`, `200`: `#bae6fd`, `300`: `#7dd3fc`, `400`: `#38bdf8`
  - `500`: `#0ea5e9`, `600`: `#0284c7`, `700`: `#0369a1`, `800`: `#075985`, `900`: `#0c4a6e`

### 1.4 Status & Feedback Signals
| Status | Text Token | Text Hex | Background Token | Background Hex | Border Token / Hex |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Good / Human / Verified** | `--good` | `#15803d` | `--good-bg` | `#ecfdf5` | `--good-border`: `#86efac` |
| **Warning / Probable AI** | `--warn` | `#b45309` | `--warn-bg` | `#fef3c7` | `#fde68a` |
| **Danger / High AI / Error** | `--danger` | `#dc2626` | `--danger-bg` | `#fef2f2` | `--danger-border`: `#fecaca` |

---

## 2. Typography

- **Primary Font Family**:
  - `font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;` (or Geist / Inter when using modern Next.js root layout)
- **Scale & Weights**:
  - **App Title**: `1.6rem` to `1.65rem` (`26px`), `font-weight: 700`, `letter-spacing: -0.02em`
  - **Header Center Title**: `1.35rem` (`21.6px`), `font-weight: 600`, `letter-spacing: -0.01em`
  - **Header Subtitle**: `0.90rem` (`14.4px`), `font-weight: 400`, `font-style: italic`, `opacity: 0.9`
  - **Section Headings (`h2`)**: `1.25rem` – `1.30rem`, `font-weight: 700`, `color: #1a2332`
  - **Card Headings (`h3`)**: `1.05rem` – `1.15rem`, `font-weight: 600`
  - **Body Text**: `0.875rem` – `0.95rem` (`14px`–`15.2px`), `line-height: 1.55`
  - **Badges / Version Tags**: `0.72rem`, `font-weight: 700`, `letter-spacing: 0.04em`
  - **Pills**: `0.72rem`, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.06em`
  - **Small / Meta / Captions**: `0.75rem` – `0.80rem`, `color: #5a6a7e`

---

## 3. Spacing & Sizing

- **Global Page Wrap**: `min-height: 100vh; display: flex; flex-direction: column;`
- **Main Container (`.solo`)**: `max-width: 1080px; margin: 24px auto; padding: 0 16px; width: 100%; flex: 1;`
- **Two-Column Container (`.layout`)**: `max-width: 1100px; margin: 22px auto; padding: 0 16px; display: grid; grid-template-columns: 1fr 300px; gap: 18px;`
- **Card Padding**: `24px` standard desktop, `16px` mobile
- **Form Controls / Tabs**:
  - Input field padding: `10px 14px`
  - Button padding: `8px 16px` (compact) or `12px 24px` (prominent CTA)
  - Pill padding: `4px 12px`

---

## 4. Border Radius

- **Pill & Version Badges**: `rounded-full` (`999px`)
- **Cards & Primary Panels**: `12px` (`rounded-xl`)
- **Tabs & Stepper Items**: `10px` (`rounded-lg`)
- **Inputs & Standard Buttons**: `8px` (`rounded-md` / `rounded-lg`)
- **App Icons**: `8px` to `10px` with slight inset shadow
- **Author Avatar**: `50%` (`rounded-full`), `border: 2px solid rgba(255, 255, 255, 0.4)`

---

## 5. Shadows

- **Subtle Surface (`--shadow-sm`)**: `0 1px 3px rgba(0, 0, 0, 0.05)`
- **Interactive Card / Elevated (`--shadow-md`)**: `0 4px 14px rgba(15, 107, 107, 0.08)`
- **Header Elevation**: `0 2px 10px rgba(10, 74, 74, 0.15)`
- **Primary CTA Glow**: `0 4px 14px rgba(21, 128, 61, 0.25)` or `0 4px 14px rgba(15, 107, 107, 0.25)`
- **Focus Rings**: `box-shadow: 0 0 0 3px rgba(15, 107, 107, 0.2)`

---

## 6. Dark / Light Mode Behavior

- **Dominant Behavior in Repos**:
  - The primary UI across `Sysrevai`, `AIMed`, `AIPICO-app`, and `preppt` is a high-contrast clinical/academic **Light Mode** (`--bg: #f6f8fa`, `--card: #ffffff`, `--ink: #1a2332`).
  - Dark mode surfaces are defined in `roshdy-med-suite` under the `navy` scale:
    - `navy-800`: `#0f172a`
    - `navy-850`: `#0b132b`
    - `navy-900`: `#0a0f1d`
    - `navy-950`: `#060a14`
  - The Header itself consistently uses a deep teal gradient (`linear-gradient(135deg, #0f6b6b, #0a4a4a)`) in both themes, providing high contrast and visual anchoring.

---

## 7. Header Specification

- **Background**: `linear-gradient(135deg, #0f6b6b, #0a4a4a)`
- **Text Color**: `#ffffff`
- **Padding**: `20px 20px` (or `h-16 flex items-center` in Tailwind navbar)
- **Inner Container**: `max-width: 1140px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 20px;`
- **Left Column**:
  - App Icon (rounded 8px–10px, subtle shadow)
  - Title: "Kashef" (`1.65rem`, bold, tracking -0.02em)
  - Version Tag: `v1.0` or `Phase 1` (`background: rgba(255, 255, 255, 0.20)`, `border: 1px solid rgba(255, 255, 255, 0.40)`, `rounded-full`)
- **Center Column**:
  - Title: App headline (`1.35rem`, 600 weight)
  - Subtitle: Tagline (`0.90rem`, italic, opacity 0.92)
- **Right Column**:
  - Author Name: "Dr. Raouf Roshdy" (italic, 0.95rem, 500 weight)
  - Avatar: Circular (`dr-raouf.jpg`, `40px`–`44px`, 2px white border)
  - GitHub Link: `https://github.com/roroleaks`

---

## 8. Footer Specification

- **Background**: `#0a4a4a` (or structured `bg-slate-100` / `border-t border-slate-200`)
- **Color**: `rgba(255, 255, 255, 0.8)` or `text-slate-600`
- **Text Sizing**: `0.82rem` (`text-xs`), line-height: `1.6`
- **Mandatory Elements**:
  1. **Honesty & Clinical/Academic Disclaimer Banner**: Prominently displayed notice stating results are probabilistic and not the sole basis for academic/disciplinary decisions.
  2. **Author & Credits**: "Dr. Raouf Roshdy • GitHub: roroleaks"
  3. **Copyright & Version Notice**: `© 2026 Kashef · Probabilistic AI Authorship Estimation`
  4. **Deployment & Stack Credit**: "Next.js & TypeScript · Deployed on Vercel"

---

## 9. Tab & Stepper System (from Sysrevai / Preppt)

- **Container**: `pipeline-stepper` / segmented tab bar, `border: 1px solid #d8dee6; border-radius: 10px; background: #f8fafb;`
- **Tab Item**: Equal flex distribution, `padding: 10px 14px`, transition `all 0.2s`
- **Active Tab**: Background `#e3f2f2` (`--accent-light`), text `#0f6b6b` (`--accent`), bold indicator
- **Inactive Tab**: Background `#f8fafb`, text `#5a6a7e` (`--muted`)

---

## 10. Not Found (Explicitly Not Present in Repos)

The following details were **not found** in your repos and will **not** be invented:
1. **Arabic Font Specification**: While Arabic support is planned, no custom Arabic typeface (such as Amiri, Cairo, or IBM Plex Sans Arabic) is specified in the inspected repos. We will rely on modern system Arabic fallback (`system-ui, -apple-system, 'Segoe UI', Tahoma, Arial`) with full `dir="rtl"` support until you specify a preferred font.
2. **Explicit Dark-Mode Toggle Switch**: The inspected repos use either clean light theme or persistent dark navbar without an explicit client-side toggle button; we will structure Tailwind `dark:` classes cleanly without forcing an unrequested toggle.
3. **Sound / Audio Feedback Tokens**: None present in repos.
4. **Custom Motion / Physics Spring Configs**: Repos use standard CSS transitions (`all 0.2s ease` / `duration-200`).
