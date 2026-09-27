"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, Tabs } from "@heroui/react";
import {
  Activity,
  CircleAlert,
  Clock,
  Globe,
  Hash,
  Server,
  ShieldCheck,
  ShieldAlert,
  Timer,
  type LucideIcon,
} from "lucide-react";

type Val = string | number | null;
type Row = Record<string, Val>;
export type Summary = {
  servers: Row[];
  statuses: Row[];
  topIps: Row[];
  events: Row[];
  incidents: Row[];
};

type Tone = "gray" | "red" | "orange" | "yellow" | "green" | "blue";

const RULES: Record<string, { label: string; tone: Tone }> = {
  scan_404: { label: "Escaneo 404", tone: "orange" },
  sensitive_path_probe: { label: "Ruta sensible", tone: "red" },
  login_bruteforce: { label: "Fuerza bruta", tone: "yellow" },
};

const REFRESH_MS = 10_000;
const ONLINE_MS = 5 * 60_000;
const HOT_MS = 60 * 60_000;

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const dtf = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "medium" });
const nf = new Intl.NumberFormat("es");

function ago(ts: Val, now: number) {
  if (!ts) return "—";
  const s = Math.round((new Date(String(ts)).getTime() - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(s, "second");
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

const exact = (ts: Val) => (ts ? dtf.format(new Date(String(ts))) : "");

// Traefik names like "secops-application-e0jbhc-11-websecure@docker" -> "secops-application-e0jbhc"
const serviceName = (s: Val) =>
  s ? String(s).replace(/@\w+$/, "").replace(/-(websecure|web)$/, "").replace(/-\d+$/, "") : "—";

function statusTone(code: number): Tone {
  if (code >= 500) return "red";
  if (code >= 400) return "orange";
  if (code >= 300) return "blue";
  return "green";
}

function Tag({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex h-5 items-center rounded-[3px] px-1.5 text-[12.5px] leading-none whitespace-nowrap"
      style={{ background: `var(--n-${tone}-bg)`, color: `var(--n-${tone}-fg)` }}
    >
      {children}
    </span>
  );
}

function Property({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[34px] items-center text-sm">
      <div className="flex w-32 shrink-0 items-center gap-1.5 text-(--muted) sm:w-40">
        <Icon size={15} strokeWidth={1.75} aria-hidden />
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

type Col = { key: string; label: string; icon: LucideIcon; render: (r: Row) => React.ReactNode; className?: string };

function Database({ label, rows, cols, empty }: { label: string; rows: Row[]; cols: Col[]; empty: string }) {
  return (
    <Table variant="secondary" className="rounded-none bg-transparent p-0">
      <Table.ScrollContainer>
        <Table.Content aria-label={label} className="min-w-full text-sm">
          <Table.Header>
            {cols.map((c, i) => (
              <Table.Column
                key={c.key}
                isRowHeader={i === 0}
                className="h-9 rounded-none border-y border-(--border) bg-transparent px-2 text-left text-[13px] font-normal text-(--muted) whitespace-nowrap"
              >
                <span className="inline-flex items-center gap-1.5">
                  <c.icon size={14} strokeWidth={1.75} aria-hidden />
                  {c.label}
                </span>
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body
            renderEmptyState={() => <p className="py-8 text-center text-sm text-(--muted)">{empty}</p>}
          >
            {rows.map((r, i) => (
              <Table.Row key={String(r.id ?? i)} id={String(r.id ?? i)} className="hover:bg-(--n-hover)">
                {cols.map((c) => (
                  <Table.Cell key={c.key} className={`h-9 rounded-none border-b border-(--border) bg-transparent px-2 whitespace-nowrap ${c.className ?? ""}`}>
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

function TrafficBar({ statuses }: { statuses: Row[] }) {
  const classes = useMemo(() => {
    const acc: Record<string, number> = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
    for (const s of statuses) {
      if (s.status_code == null) continue;
      const k = `${String(s.status_code)[0]}xx`;
      if (k in acc) acc[k] += Number(s.total);
    }
    return acc;
  }, [statuses]);
  const total = Object.values(classes).reduce((a, b) => a + b, 0);
  const tones: Record<string, Tone> = { "2xx": "green", "3xx": "blue", "4xx": "orange", "5xx": "red" };

  if (!total) return <p className="text-sm text-(--muted)">Todavía no hay tráfico HTTP en las últimas 24 horas.</p>;

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-(--n-gray-bg)" role="img"
        aria-label={Object.entries(classes).map(([k, v]) => `${k}: ${v}`).join(", ")}>
        {Object.entries(classes).map(([k, v]) =>
          v ? <div key={k} style={{ width: `${(v / total) * 100}%`, background: `var(--n-${tones[k]}-fg)` }} /> : null,
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-(--muted)">
        {Object.entries(classes).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: `var(--n-${tones[k]}-fg)` }} />
            <span className="text-(--foreground)">{k}</span>
            <span className="tabular">{nf.format(v)}</span>
            <span className="tabular">· {Math.round((v / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ data, fetchedAt }: { data: Summary; fetchedAt: string }) {
  const router = useRouter();
  const [onlyErrors, setOnlyErrors] = useState(false);
  const now = new Date(fetchedAt).getTime();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const hot = data.incidents.filter((i) => now - new Date(String(i.created_at)).getTime() < HOT_MS);
  const online = data.servers.filter((s) => s.last_seen_at && now - new Date(String(s.last_seen_at)).getTime() < ONLINE_MS);
  const events = onlyErrors ? data.events.filter((e) => Number(e.status_code) >= 400) : data.events;
  const maxIp = Math.max(1, ...data.topIps.map((r) => Number(r.total)));

  // The IP behind the most incident hits in the last hour leads the callout.
  const suspect = useMemo(() => {
    const byIp = new Map<string, number>();
    for (const i of hot) byIp.set(String(i.client_ip), (byIp.get(String(i.client_ip)) ?? 0) + Number(i.hits));
    return [...byIp.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [hot]);

  const ip = (r: Row) => <span className="mono">{r.client_ip ?? "—"}</span>;
  const when = (key: string) =>
    function renderWhen(r: Row) {
      return (
        <time dateTime={String(r[key])} title={exact(r[key])} className="text-(--muted)">
          {ago(r[key], now)}
        </time>
      );
    };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 flex h-11 items-center justify-between bg-(--background)/90 px-4 text-sm backdrop-blur-sm">
        <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1.5 text-(--muted)">
          <span className="truncate">Zenlor Labs</span>
          <span aria-hidden>/</span>
          <span className="truncate text-(--foreground)">Security Monitor</span>
        </nav>
        <span className="inline-flex shrink-0 items-center gap-2 text-[13px] text-(--muted)">
          <span className="live-dot size-1.5 rounded-full bg-(--n-green-fg)" aria-hidden />
          En vivo · cada {REFRESH_MS / 1000}s
        </span>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-4 pb-24 sm:px-12 lg:px-24">
        <div className="pt-16 sm:pt-20">
          <span
            className="flex size-[72px] items-center justify-center rounded-lg"
            style={{ background: hot.length ? "var(--n-red-bg)" : "var(--n-green-bg)", color: hot.length ? "var(--n-red-fg)" : "var(--n-green-fg)" }}
          >
            {hot.length ? <ShieldAlert size={40} strokeWidth={1.5} aria-hidden /> : <ShieldCheck size={40} strokeWidth={1.5} aria-hidden />}
          </span>
          <h1 className="mt-5 text-[32px] leading-tight font-bold tracking-[-0.02em] text-balance sm:text-[40px]">
            Security Monitor
          </h1>
        </div>

        <section aria-label="Propiedades" className="mt-5">
          <Property icon={Activity} label="Estado">
            {hot.length ? (
              <Tag tone="red">{hot.length === 1 ? "1 incidente" : `${hot.length} incidentes`} en la última hora</Tag>
            ) : (
              <Tag tone="green">Sin incidentes en la última hora</Tag>
            )}
          </Property>
          <Property icon={Server} label="Servidores">
            <span className="flex flex-wrap gap-1.5">
              {data.servers.length ? (
                data.servers.map((s) => (
                  <Tag key={String(s.id)} tone={online.includes(s) ? "green" : "gray"}>
                    {String(s.name)}
                  </Tag>
                ))
              ) : (
                <span className="text-(--muted)">Ninguno registrado</span>
              )}
            </span>
          </Property>
          <Property icon={Hash} label="Solicitudes">
            <span className="tabular">{nf.format(data.statuses.reduce((a, s) => a + Number(s.total), 0))}</span>
            <span className="text-(--muted)"> en 24 h</span>
          </Property>
          <Property icon={Clock} label="Actualizado">
            <time dateTime={fetchedAt} title={exact(fetchedAt)}>{dtf.format(new Date(fetchedAt))}</time>
          </Property>
        </section>

        <div className="my-6 border-t border-(--border)" />

        {suspect ? (
          <aside className="flex gap-3 rounded-md px-4 py-3.5" style={{ background: "var(--n-red-bg)" }}>
            <CircleAlert size={20} strokeWidth={1.75} className="mt-px shrink-0" style={{ color: "var(--n-red-fg)" }} aria-hidden />
            <p className="text-[15px] leading-relaxed">
              La IP <span className="mono font-medium">{suspect[0]}</span> acumula{" "}
              <b className="tabular">{nf.format(suspect[1])}</b> solicitudes sospechosas en la última hora. Revisa la
              pestaña Incidentes y bloquéala en Cloudflare si no es tuya.
            </p>
          </aside>
        ) : (
          <aside className="flex gap-3 rounded-md bg-(--n-callout) px-4 py-3.5">
            <ShieldCheck size={20} strokeWidth={1.75} className="mt-px shrink-0 text-(--muted)" aria-hidden />
            <p className="text-[15px] leading-relaxed">
              Nada que atender ahora. Los detectores revisan escaneos 404, rutas sensibles y fuerza bruta cada minuto.
            </p>
          </aside>
        )}

        <h2 className="mt-12 mb-3 text-xl font-semibold tracking-[-0.01em]">Tráfico de las últimas 24 horas</h2>
        <TrafficBar statuses={data.statuses} />

        <Tabs className="mt-12" variant="secondary">
          <Tabs.ListContainer className="overflow-x-auto">
            <Tabs.List aria-label="Vistas" className="flex w-full justify-start gap-1 border-b border-(--border)">
              {[
                ["incidents", "Incidentes", data.incidents.length, ShieldAlert],
                ["events", "Solicitudes", data.events.length, Globe],
                ["ips", "IPs", data.topIps.length, Hash],
                ["servers", "Servidores", data.servers.length, Server],
              ].map(([id, label, n, Icon]) => {
                const I = Icon as LucideIcon;
                return (
                  <Tabs.Tab key={id as string} id={id as string} className="w-auto flex-none gap-1.5 px-2 text-sm whitespace-nowrap">
                    <I size={15} strokeWidth={1.75} aria-hidden />
                    {label as string}
                    <span className="tabular text-(--muted)">{n as number}</span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                );
              })}
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel id="incidents" className="pt-3">
            <Database
              label="Incidentes"
              rows={data.incidents}
              empty="Sin incidentes registrados. Cuando una regla se dispare aparecerá aquí y en Telegram."
              cols={[
                { key: "created_at", label: "Cuándo", icon: Clock, render: when("created_at") },
                { key: "rule", label: "Regla", icon: ShieldAlert, render: (r) => {
                  const rule = RULES[String(r.rule)] ?? { label: String(r.rule), tone: "gray" as Tone };
                  return <Tag tone={rule.tone}>{rule.label}</Tag>;
                } },
                { key: "client_ip", label: "IP", icon: Hash, render: ip },
                { key: "hits", label: "Hits/min", icon: Activity, render: (r) => <span className="tabular">{nf.format(Number(r.hits))}</span>, className: "text-right" },
                { key: "sample_path", label: "Ruta", icon: Globe, render: (r) => <span className="mono">{r.sample_path ?? "—"}</span> },
                { key: "server", label: "Servidor", icon: Server, render: (r) => String(r.server) },
              ]}
            />
          </Tabs.Panel>

          <Tabs.Panel id="events" className="pt-3">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                aria-pressed={onlyErrors}
                onClick={() => setOnlyErrors((v) => !v)}
                className="rounded-[4px] px-2 py-1 text-[13px] text-(--muted) transition-colors hover:bg-(--n-hover) aria-pressed:bg-(--n-blue-bg) aria-pressed:text-(--n-blue-fg)"
              >
                Solo errores (≥ 400)
              </button>
            </div>
            <Database
              label="Solicitudes"
              rows={events}
              empty={onlyErrors ? "Ninguna solicitud con error entre las últimas 100." : "Todavía no llegan solicitudes."}
              cols={[
                { key: "ts", label: "Cuándo", icon: Clock, render: when("ts") },
                { key: "status_code", label: "Código", icon: Activity, render: (r) =>
                  r.status_code == null ? "—" : <Tag tone={statusTone(Number(r.status_code))}>{String(r.status_code)}</Tag> },
                { key: "method", label: "Método", icon: Hash, render: (r) => <span className="mono">{r.method ?? "—"}</span> },
                { key: "path", label: "Ruta", icon: Globe, render: (r) => (
                  <span className="mono block max-w-[340px] truncate" title={String(r.path ?? "")}>{r.path ?? "—"}</span>
                ) },
                { key: "client_ip", label: "IP", icon: Hash, render: ip },
                { key: "service", label: "Servicio", icon: Server, render: (r) => (
                  <span title={String(r.service ?? "")}>{serviceName(r.service)}</span>
                ) },
                { key: "duration_ms", label: "Duración", icon: Timer, render: (r) =>
                  r.duration_ms == null ? "—" : <span className="tabular text-(--muted)">{nf.format(Number(r.duration_ms))} ms</span>, className: "text-right" },
              ]}
            />
          </Tabs.Panel>

          <Tabs.Panel id="ips" className="pt-3">
            <Database
              label="IPs más activas"
              rows={data.topIps.map((r) => ({ ...r, id: r.client_ip }))}
              empty="Sin IPs en las últimas 24 horas."
              cols={[
                { key: "client_ip", label: "IP", icon: Hash, render: ip },
                { key: "total", label: "Solicitudes en 24 h", icon: Activity, render: (r) => (
                  <span className="flex items-center gap-3">
                    <span className="tabular w-12 text-right">{nf.format(Number(r.total))}</span>
                    <span className="h-1.5 w-40 overflow-hidden rounded-full bg-(--n-gray-bg)">
                      <span className="block h-full rounded-full bg-(--n-blue-fg)" style={{ width: `${(Number(r.total) / maxIp) * 100}%` }} />
                    </span>
                  </span>
                ) },
                { key: "flag", label: "Incidentes", icon: ShieldAlert, render: (r) => {
                  const n = data.incidents.filter((i) => i.client_ip === r.client_ip).length;
                  return n ? <Tag tone="red">{n}</Tag> : <span className="text-(--muted)">—</span>;
                } },
              ]}
            />
          </Tabs.Panel>

          <Tabs.Panel id="servers" className="pt-3">
            <Database
              label="Servidores"
              rows={data.servers}
              empty="Ningún servidor registrado. Crea uno con: node ace server:create <nombre>"
              cols={[
                { key: "name", label: "Nombre", icon: Server, render: (r) => String(r.name) },
                { key: "state", label: "Estado", icon: Activity, render: (r) =>
                  online.includes(r) ? <Tag tone="green">Enviando</Tag> : <Tag tone="gray">Sin señal</Tag> },
                { key: "last_seen_at", label: "Último evento", icon: Clock, render: when("last_seen_at") },
              ]}
            />
          </Tabs.Panel>
        </Tabs>
      </main>
    </div>
  );
}
