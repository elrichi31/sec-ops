---
version: 1
slug: "frontend-app-page-tsx"
primary_target: "frontend/app/page.tsx"
related_targets: []
---

## Scope

Dashboard (frontend/app/page.tsx). Mode: Operate. Audience: Zenlor team checking their own infrastructure; job: see attacks, health, and suspects in one pass.

## Direction contract

THESIS: The monitor is a Notion page about your infrastructure, not a SOC wall: page title, properties, callout, and database views. Refuses the dark neon KPI-tile dashboard.
OWN-WORLD: Notion grammar. White/#191919 ground, #37352f ink, hairline rgba borders, system UI stack, muted Notion tag colors (red/orange/yellow/green/blue/gray), mono only for IPs and paths, no cards, no shadows.
STORY: Title plus status property answers "are we under attack"; the traffic bar answers "is it healthy"; database views let the team drill into incidents, requests, IPs, and servers.
FIRST VIEWPORT: Breadcrumb topbar with a live dot; shield page icon and a 40px title; property rows (Estado, Servidores, Ventana, Actualizado); a callout naming the most active IP; a stacked HTTP-class bar; view tabs with counts. Primary action: switching views.
FORM: Pinned by the user (Notion style + HeroUI); seed c03dd9ff rolled, pin overrides.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
