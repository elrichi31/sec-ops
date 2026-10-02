# Design

The app follows Apple's macOS/iOS language: a grouped gray ground with white inset panels, a floating sidebar and a floating glass topbar aligned on an 8px inset, iOS Large Titles and system colors. Built with HeroUI v3 (Table, form fields) on Tailwind v4; tokens live in `frontend/app/globals.css`.

## Palette

Apple system colors. Tokens live on `:root` and `.dark`; the `.dark` class follows the OS theme via an inline script in `layout.tsx`.

| Role | Light | Dark |
|---|---|---|
| Ground `--background` | #f5f5f7 | #000000 |
| Panel `--surface` | #ffffff | #1c1c1e |
| Ink `--foreground` | #1d1d1f | #f5f5f7 |
| Secondary `--muted` | #6e6e73 | #98989d |
| Separator `--border` | rgba(60,60,67,.12) | rgba(255,255,255,.09) |
| Accent `--accent` | #007aff | #0a84ff |
| Material `--glass` | rgba(250,250,252,.9) | rgba(28,28,30,.9) |

Tag tones `--n-{gray,red,orange,yellow,green,blue}-{bg,fg}` (the `--n-` prefix is historical): a translucent tint of the system color as ground, Apple's high-contrast variant as text. They carry all meaning: red = attack/sensitive, orange = 4xx/scan, yellow = brute force, green = healthy/online, blue = 3xx/selected filter, gray = inactive.

## Type

San Francisco via `-apple-system` (Inter / Segoe UI elsewhere), 14px body with -0.006em tracking. Large Title 34px bold (30px mobile) at -0.025em, panel headings 17px semibold (Apple "headline"). Monospace (SF Mono) only for data: IPs, paths, methods. Tabular numerals for counts and durations.

## Utilities

- `panel`: `--surface`, 18px radius, `--shadow-card` (a hairline ring in dark). Named `panel` because HeroUI already owns `.card`.
- `glass`: `--glass` + Tailwind `backdrop-blur-[40px] backdrop-saturate-[1.8]` (a hand-written `backdrop-filter` gets stripped by the CSS pipeline); solid under `prefers-reduced-transparency`.
- `press`: scales to 0.97 on `:active` (off under reduced motion). On every tappable control.

## Components

- **Tag**: 22px capsule, 12px medium, tone bg + fg. Status codes, rules, server state.
- **Callout**: a panel with a 36px tinted circular icon (red when an IP leads the last hour's incidents, green when calm) and an accent link.
- **Database view**: HeroUI `Table` inside a panel; 44px rows, 16px side padding, hairline separators (none under the last row), 12px semibold muted headers, no icons.
- **Filters**: capsules. Active filter chip in blue tint with an ✕; toggles fill with the accent when pressed.
- **Links**: "Ver todo ›" and inline actions in the accent color.

## Layout

- **Sidebar** (240px, floating 8px from the edges, 16px radius, solid `--surface` + hairline border + card shadow): app-icon style logo (blue gradient squircle) with name and "Security Monitor" subtitle in a 56px header aligned with the topbar; "Monitor" nav with accent icons, active item filled with the accent and white text; "Próximamente" items in `--n-faint` with a "Pronto" capsule; user row at the bottom opening a glass menu (pops in from the bottom) with Cerrar sesión. Collapsed (via the topbar toggle) state lives on `html[data-sidebar]`, set before paint. Under 768px it slides in as a drawer with a scrim.
- **Topbar** (56px, floating 8px from the edges, 16px radius, `glass` + hairline border, sticky): sidebar toggle and breadcrumb (lg+, › separator) left; centered search field (Ctrl/⌘ K; IP prefix, host or path substring → /solicitudes?q=); right: Local/UTC clocks (2xl+), status capsule tinted red/green with the live dot (label from sm, detail from xl), bell to Incidentes (red dot when hot), theme toggle. Icon buttons are circular.
- Content column max 1180px, 16px gutter on mobile. Panels sit 12–16px apart. Tables scroll horizontally inside their panel; the page never does.
- **Login**: two blurred ambient light blobs (blue, indigo) behind a `glass` card (28px radius, float shadow) with a 72px app icon. Email and password are one iOS-style grouped field (hairline between rows, focus ring on the group) with floating labels; password has a show/hide toggle and a Caps Lock hint. A wrong password shakes the group (off under reduced motion) and shows the error inline below it. 48px accent button; a small "Acceso restringido" line under the card.

## Charts

- Series colors `--c-2xx/3xx/4xx/5xx` are validated with the dataviz validator separately for light (#fff) and dark (#191919). The light 4xx amber is below 3:1 against white, so the chart always has a legend, per-bar tooltips with values, and an sr-only table.
- **HourlyBars** (traffic by status class, incidents per hour): 24 bars, stacked when multi-series, 2px gaps between segments, 4px rounded top on the top segment, 3 recessive gridlines, tooltip with the per-class breakdown and total on hover/focus.
- **HourlyLines** (latency p50 blue / p95 red, validated pair): 2px lines on one ms axis, gaps where an hour has no data, isolated points drawn as 8px dots with a surface ring, crosshair + tooltip on hover/focus.
- **BarList**: ranked rows with a 16%-opacity `--c-bar` fill behind the label, value right-aligned in muted tabular numerals; rows link to the filtered Solicitudes view.
- **Monitoreo**: a grid of server cards (live dot, CPU/Memoria/Disco bars, cores · RAM · container count; selected = 2px accent ring) opens one server below: 4 tiles (28px rounded figure + usage bar), CPU/memory HourlyLines, and a container list sortable by Memoria/CPU through an iOS segmented control. Usage bars are green, orange from 75 %, red from 90 %.
- **Stat widgets** (Resumen): 6 panels (requests, error %, unique IPs, incidents, p95 latency, probes), 28px semibold figures in SF Pro Rounded (`.rounded-num`, falls back to the system font off Apple), muted label and hint.

## Motion

The live dot pulse; `press` feedback on tap; the user menu pops in (180ms, from its trigger); the mobile sidebar slides on an iOS sheet curve (`cubic-bezier(.32,.72,0,1)`, 300ms); theme changes ease the ground color. Pulse, pop and press are disabled under reduced motion. Data refreshes in place every 10s via `router.refresh()`, keeping filters and scroll.
