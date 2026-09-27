# Design

The dashboard is a Notion page about the infrastructure: page icon, title, property rows, a callout, and database views. Built with HeroUI v3 (Tabs, Table) on Tailwind v4, with Notion's palette mapped onto HeroUI tokens in `frontend/app/globals.css`.

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
- **Property row**: icon + muted label column (128px mobile, 160px desktop), value on the right.
- **Callout**: 6px radius, tinted ground, icon left. Red when an IP leads the last hour's incidents; gray otherwise.
- **Database view**: HeroUI `Tabs` (left-aligned, hugging content, count in muted numerals) over HeroUI `Table` variant secondary, flattened: no radius, no fill, hairline row borders, header with icon + muted label, row hover tint.
- **Traffic bar**: 8px stacked bar of 2xx/3xx/4xx/5xx with a dot legend (count and share).

## Layout

Sticky 44px topbar (breadcrumb left, live dot right). Content column max 1100px, 16px gutter on mobile, 48–96px on larger screens. Tables scroll horizontally inside their container; the page never does.

## Motion

One moment: the live dot pulse (disabled under reduced motion). Data refreshes in place every 10s via `router.refresh()`, keeping the selected tab.
