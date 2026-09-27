# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Zenlor Labs' own team, first. They operate the servers Zenlor hosts (a Dokploy VM behind Cloudflare today) and open the dashboard to know what is hitting their infrastructure. Paying customers are a later audience and not designed for yet.

## Product Purpose

Zenlor Security Monitor collects HTTP access logs from any proxy (Traefik, Nginx; more via connectors), normalizes them to one event shape, detects suspicious behavior (404 scans, sensitive-path probes, login brute force), and alerts via Telegram. Success: opening the dashboard answers the whole picture at once: are we under attack right now, is everything healthy, and which IP or path deserves a closer look.

## Positioning

Infrastructure-agnostic: an OpenTelemetry Collector with per-source normalization feeds one central backend, so Dokploy/Traefik is one integration among many, not a requirement. The real client IP is resolved behind Cloudflare, trusting CF-Connecting-IP only when the peer is a Cloudflare range.

## Operating Context

- Central: AdonisJS API + PostgreSQL; dashboard: Next.js 16 app router, server-rendered, Basic Auth, auto-refresh.
- Deployed as a Dokploy Compose app at sec-ops.zenlorlabs.com behind Cloudflare.
- Real traffic includes internet scanners hitting the raw VM IP (no matched router), which is expected and useful signal.

## Capabilities and Constraints

- Data available per summary: servers (name, last_seen_at), HTTP status counts (24h), top IPs (24h), last 100 events (ts, server, source, service, client_ip, method, path, status_code, duration_ms), last 50 incidents (rule, client_ip, server, hits, sample_path, created_at).
- Detection rules: scan_404, sensitive_path_probe, login_bruteforce; evaluated every minute over the last minute.
- UI stack chosen by the user: HeroUI v3 + Tailwind v4.
- Undecided: per-customer tenancy, filtering/search, historical charts.

## Brand Commitments

- Name: Zenlor Security Monitor, by Zenlor Labs.
- Interface language: Spanish.
- User-specified style: Notion-like.

## Evidence on Hand

Live production data only. No customers, testimonials, or metrics to cite; do not fabricate any.

## Product Principles

1. Truth over reassurance: show what is actually happening, including noise from scanners.
2. Everything answerable at a glance, details one step away.
3. Proxy-agnostic: never assume the source is Traefik.
4. Secure by default: nothing public without auth; never trust client-supplied headers blindly.
