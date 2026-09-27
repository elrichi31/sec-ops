"use client";

import { Table } from "@heroui/react";

export type Val = string | number | null;
export type Row = Record<string, Val>;
export type Tone = "gray" | "red" | "orange" | "yellow" | "green" | "blue";

export const RULES: Record<string, { label: string; tone: Tone }> = {
  scan_404: { label: "Escaneo 404", tone: "orange" },
  sensitive_path_probe: { label: "Ruta sensible", tone: "red" },
  login_bruteforce: { label: "Fuerza bruta", tone: "yellow" },
};
export const rule = (r: Val) => RULES[String(r)] ?? { label: String(r), tone: "gray" as Tone };

export const ONLINE_MS = 5 * 60_000;
export const HOT_MS = 60 * 60_000;

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const dtf = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium" });
export const nf = new Intl.NumberFormat("es");

export function ago(ts: Val, now: number) {
  if (!ts) return "—";
  const s = Math.round((new Date(String(ts)).getTime() - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(s, "second");
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

export const exact = (ts: Val) => (ts ? dtf.format(new Date(String(ts))) : "");

// Traefik names like "secops-application-e0jbhc-11-websecure@docker" -> "secops-application-e0jbhc"
export const serviceName = (s: Val) =>
  s ? String(s).replace(/@\w+$/, "").replace(/-(websecure|web)$/, "").replace(/-\d+$/, "") : "—";

export function statusTone(code: number): Tone {
  if (code >= 500) return "red";
  if (code >= 400) return "orange";
  if (code >= 300) return "blue";
  return "green";
}

export const isOnline = (s: Row, now: number) =>
  !!s.last_seen_at && now - new Date(String(s.last_seen_at)).getTime() < ONLINE_MS;

export function Tag({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-full px-2 text-[12px] leading-none font-medium whitespace-nowrap"
      style={{ background: `var(--n-${tone}-bg)`, color: `var(--n-${tone}-fg)` }}
    >
      {children}
    </span>
  );
}

export function When({ ts, now }: { ts: Val; now: number }) {
  return (
    <time dateTime={String(ts)} title={exact(ts)} className="text-(--muted)">
      {ago(ts, now)}
    </time>
  );
}

export const Mono = ({ children }: { children: React.ReactNode }) => <span className="mono">{children ?? "—"}</span>;

export function PageTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="pt-8 pb-6 sm:pt-10">
      <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.025em] text-balance sm:text-[34px]">{title}</h1>
      <p className="mt-1.5 text-[15px] text-(--muted)">{description}</p>
    </div>
  );
}

export type Col = { key: string; label: string; render: (r: Row) => React.ReactNode; align?: "right" };

export function Database({ label, rows, cols, empty }: { label: string; rows: Row[]; cols: Col[]; empty: string }) {
  return (
    <Table variant="secondary" className="panel overflow-hidden p-0">
      <Table.ScrollContainer>
        <Table.Content aria-label={label} className="min-w-full text-sm">
          <Table.Header>
            {cols.map((c, i) => (
              <Table.Column
                key={c.key}
                isRowHeader={i === 0}
                className={`h-10 rounded-none border-b border-(--border) bg-transparent px-4 after:hidden text-[12px] font-semibold text-(--muted) whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"}`}
              >
                {c.label}
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body renderEmptyState={() => <p className="py-10 text-center text-sm text-(--muted)">{empty}</p>}>
            {rows.map((r, i) => (
              <Table.Row key={String(r.id ?? i)} id={String(r.id ?? i)} className="transition-colors hover:bg-(--n-hover) [&:last-child>td]:border-b-0">
                {cols.map((c) => (
                  <Table.Cell
                    key={c.key}
                    className={`h-11 rounded-none border-b border-(--border) bg-transparent px-4 whitespace-nowrap ${c.align === "right" ? "text-right" : ""}`}
                  >
                    {c.render(r)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
