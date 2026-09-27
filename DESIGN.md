# Design

The app is a Notion workspace about the infrastructure: sidebar, breadcrumb topbar, and one page per view (icon, title, callout, database tables, charts). Built with HeroUI v3 (Table, form fields) on Tailwind v4, with Notion's palette mapped onto HeroUI tokens in `frontend/app/globals.css`.

## Palette

Neutral ground plus Notion's muted tag colors. Tokens live on `:root` and `.dark`; the `.dark` class follows the OS theme via an inline script in `layout.tsx`.

| Role | Light | Dark |
|---|---|---|
| Ground `--background` | #ffffff | #191919 |
| Ink `--foreground` | #37352f | rgba(255,255,255,.86) |
| Secondary `--muted` | #787774 | #9b9b9b |
| Hairline `--border` | rgba(55,53,47,.09) | rgba(255,255,255,.094) |
| Row hover `--n-hover` | rgba(55,53,47,.06) | rgba(255,255,255,.055) |
| Accent `--accent` | #2383e2 | #529cca |

Tag tones `--n-{gray,red,orange,yellow,green,blue}-{bg,fg}` carry all meaning: red = attack/sensitive, orange = 4xx/scan, yellow = brute force, green = healthy/online, blue = 3xx/selected filter, gray = inactive.

## Type

System UI stack (Notion's own), 14px body, 40px bold page title (32px on mobile), 20px semibold section headings. Monospace only for data: IPs, paths, methods. Tabular numerals for counts and durations.

## Components

- **Tag**: 20px tall, 3px radius, tone bg + fg. Used for status codes, rules, server state, page status.
- **Callout**: 6px radius, tinted ground, icon left. Red when an IP leads the last hour's incidents; gray otherwise.
- **Database view**: HeroUI `Table` variant secondary, flattened: no radius, no fill, hairline row borders, header with icon + muted label, row hover tint.

## Layout

- **Sidebar** (240px, `--surface-secondary`, hairline right border): logo + collapse button; search (Ctrl/⌘ K, IP prefix or path substring → /solicitudes?q=); "Monitor" nav (Resumen, Incidentes, Solicitudes, IPs, Servidores; active = hover tint + medium weight); "Próximamente" items in `--n-faint` with a PRONTO marker; user card at the bottom opening a menu with Cerrar sesión. Collapsed state lives on `html[data-sidebar]`, set before paint. Under 768px it is an off-canvas drawer with a scrim.
- **Topbar** (48px, sticky, hairline bottom): sidebar toggle, page icon + breadcrumb; right side Local/UTC clocks (lg+), live status dot + "Bajo ataque / Tranquilo", bell to Incidentes (red dot when hot), theme toggle (saved in localStorage, falls back to OS).
- Content column max 1180px, 16px gutter on mobile, 32–48px above. Page header: 36px muted icon, 36px bold title, one-line description. Tables scroll horizontally inside their container; the page never does.

## Charts

- Series colors `--c-2xx/3xx/4xx/5xx` are validated with the dataviz validator separately for light (#fff) and dark (#191919). The light 4xx amber is below 3:1 against white, so the chart always has a legend, per-bar tooltips with values, and an sr-only table.
- **HourlyBars** (traffic by status class, incidents per hour): 24 bars, stacked when multi-series, 2px gaps between segments, 4px rounded top on the top segment, 3 recessive gridlines, tooltip with the per-class breakdown and total on hover/focus.
- **HourlyLines** (latency p50 blue / p95 red, validated pair): 2px lines on one ms axis, gaps where an hour has no data, isolated points drawn as 8px dots with a surface ring, crosshair + tooltip on hover/focus.
- **BarList**: ranked rows with a 16%-opacity `--c-bar` fill behind the label, value right-aligned in muted tabular numerals; rows link to the filtered Solicitudes view.
- **Stat strip** (Resumen): 6 plain figures (requests, error %, unique IPs, incidents, p95 latency, probes) between hairlines (26px semibold, muted label and hint), not cards.

## Motion

One moment: the live dot pulse (disabled under reduced motion). Data refreshes in place every 10s via `router.refresh()`, keeping filters and scroll.
