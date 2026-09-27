"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, CircleAlert, Clock, Globe, Hash, LayoutGrid, Server, ShieldAlert, ShieldCheck, Timer, X } from "lucide-react";
import { BarList, Legend, TrafficChart } from "./charts";
import { Topbar } from "./shell";
import {
  Database,
  HOT_MS,
  Mono,
  PageTitle,
  Tag,
  When,
  isOnline,
  nf,
  rule,
  serviceName,
  statusTone,
  type Col,
  type Row,
} from "./ui";

type Summary = Record<"servers" | "statuses" | "topIps" | "events" | "incidents" | "timeline" | "rules" | "topPaths" | "services", Row[]> & {
  totals: Row;
};

const hotCount = (d: Summary, now: number) =>
  d.incidents.filter((i) => now - new Date(String(i.created_at)).getTime() < HOT_MS).length;

function Section({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-(--border) pb-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const SeeAll = ({ href }: { href: string }) => (
  <Link href={href} className="text-[13px] text-(--muted) hover:text-(--foreground)">Ver todo →</Link>
);

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "red" | "green" }) {
  return (
    <div className="min-w-0 py-3 pr-4 lg:pl-4 lg:first:pl-0">
      <p className="text-[13px] text-(--muted)">{label}</p>
      <p className="tabular mt-1 text-[26px] leading-none font-semibold tracking-[-0.02em]" style={tone ? { color: `var(--n-${tone}-fg)` } : undefined}>
        {value}
      </p>
      {hint && <p className="mt-1.5 truncate text-[12.5px] text-(--muted)">{hint}</p>}
    </div>
  );
}

const incidentCols = (now: number): Col[] => [
  { key: "created_at", label: "Cuándo", icon: Clock, render: (r) => <When ts={r.created_at} now={now} /> },
  { key: "rule", label: "Regla", icon: ShieldAlert, render: (r) => <Tag tone={rule(r.rule).tone}>{rule(r.rule).label}</Tag> },
  { key: "client_ip", label: "IP", icon: Hash, render: (r) => <Mono>{r.client_ip}</Mono> },
  { key: "hits", label: "Hits/min", icon: Activity, align: "right", render: (r) => <span className="tabular">{nf.format(Number(r.hits))}</span> },
  { key: "sample_path", label: "Ruta", icon: Globe, render: (r) => <Mono>{r.sample_path}</Mono> },
  { key: "server", label: "Servidor", icon: Server, render: (r) => String(r.server) },
];

/* ---------- Resumen ---------- */

export function OverviewView({ data, fetchedAt }: { data: Summary; fetchedAt: string }) {
  const now = new Date(fetchedAt).getTime();
  const hot = data.incidents.filter((i) => now - new Date(String(i.created_at)).getTime() < HOT_MS);
  const t = data.totals;
  const requests = Number(t.requests ?? 0);
  const errors = Number(t.errors ?? 0);
  const incidents24 = data.rules.reduce((a, r) => a + Number(r.total), 0);
  const online = data.servers.filter((s) => isOnline(s, now)).length;

  const suspect = useMemo(() => {
    const byIp = new Map<string, number>();
    for (const i of hot) byIp.set(String(i.client_ip), (byIp.get(String(i.client_ip)) ?? 0) + Number(i.hits));
    return [...byIp.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [hot]);

  return (
    <>
      <Topbar page="Resumen" icon={LayoutGrid} hot={hot.length} />
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-24 sm:px-8 lg:px-12">
        <PageTitle icon={hot.length ? ShieldAlert : ShieldCheck} title="Resumen" description="Todo lo que llegó a tus servidores en las últimas 24 horas." />

        <div className="grid grid-cols-2 border-y border-(--border) sm:grid-cols-3 lg:grid-cols-5 [&>*]:border-(--border) lg:[&>*:not(:first-child)]:border-l">
          <Stat label="Solicitudes" value={nf.format(requests)} hint="últimas 24 h" />
          <Stat
            label="Errores"
            value={requests ? `${Math.round((errors / requests) * 100)}%` : "—"}
            hint={`${nf.format(errors)} con código ≥ 400`}
          />
          <Stat label="IPs únicas" value={nf.format(Number(t.ips ?? 0))} hint="clientes distintos" />
          <Stat label="Incidentes" value={nf.format(incidents24)} hint={hot.length ? `${hot.length} en la última hora` : "ninguno en la última hora"} tone={hot.length ? "red" : undefined} />
          <Stat label="Servidores" value={`${online}/${data.servers.length}`} hint="enviando datos" tone={data.servers.length && online < data.servers.length ? "red" : undefined} />
        </div>

        {suspect ? (
          <aside className="mt-6 flex gap-3 rounded-md px-4 py-3.5" style={{ background: "var(--n-red-bg)" }}>
            <CircleAlert size={20} strokeWidth={1.75} className="mt-px shrink-0" style={{ color: "var(--n-red-fg)" }} aria-hidden />
            <p className="text-[15px] leading-relaxed">
              La IP <span className="mono font-medium">{suspect[0]}</span> acumula <b className="tabular">{nf.format(suspect[1])}</b> solicitudes sospechosas en la última hora.{" "}
              <Link href={`/solicitudes?q=${encodeURIComponent(suspect[0])}`} className="underline underline-offset-2">Ver su actividad</Link> y bloquéala en Cloudflare si no es tuya.
            </p>
          </aside>
        ) : (
          <aside className="mt-6 flex gap-3 rounded-md bg-(--n-callout) px-4 py-3.5">
            <ShieldCheck size={20} strokeWidth={1.75} className="mt-px shrink-0 text-(--muted)" aria-hidden />
            <p className="text-[15px] leading-relaxed">Nada que atender ahora. Los detectores revisan escaneos 404, rutas sensibles y fuerza bruta cada minuto.</p>
          </aside>
        )}

        <Section title="Tráfico por hora" action={<Legend />} className="mt-10">
          <div className="pt-12">
            <TrafficChart rows={data.timeline} />
          </div>
        </Section>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <Section title="Incidentes por regla · 24 h" action={<SeeAll href="/incidentes" />}>
            <BarList rows={data.rules} empty="Ninguna regla se disparó en 24 horas." label={(r) => <Tag tone={rule(r.rule).tone}>{rule(r.rule).label}</Tag>} />
          </Section>
          <Section title="Rutas más atacadas · errores" action={<SeeAll href="/solicitudes" />}>
            <BarList rows={data.topPaths} mono empty="Sin errores en 24 horas." label={(r) => String(r.path)} href={(r) => `/solicitudes?q=${encodeURIComponent(String(r.path))}`} />
          </Section>
          <Section title="IPs más activas" action={<SeeAll href="/ips" />}>
            <BarList rows={data.topIps.slice(0, 8)} mono empty="Sin tráfico en 24 horas." label={(r) => String(r.client_ip)} href={(r) => `/solicitudes?q=${encodeURIComponent(String(r.client_ip))}`} />
          </Section>
          <Section title="Servicios con más tráfico">
            <BarList rows={data.services} empty="Sin tráfico en 24 horas." label={(r) => <span title={String(r.service)}>{serviceName(r.service)}</span>} />
          </Section>
        </div>

        <Section title="Últimos incidentes" action={<SeeAll href="/incidentes" />} className="mt-10">
          <Database label="Últimos incidentes" rows={data.incidents.slice(0, 5)} empty="Sin incidentes registrados." cols={incidentCols(now)} />
        </Section>
      </main>
    </>
  );
}

/* ---------- Incidentes ---------- */

export function IncidentsView({ data, fetchedAt }: { data: Summary; fetchedAt: string }) {
  const now = new Date(fetchedAt).getTime();
  return (
    <>
      <Topbar page="Incidentes" icon={ShieldAlert} hot={hotCount(data, now)} />
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-24 sm:px-8 lg:px-12">
        <PageTitle icon={ShieldAlert} title="Incidentes" description="Reglas que se dispararon. Cada IP avisa una vez cada 10 minutos por regla." />
        <Database label="Incidentes" rows={data.incidents} empty="Sin incidentes. Cuando una regla se dispare aparecerá aquí y en Telegram." cols={incidentCols(now)} />
      </main>
    </>
  );
}

/* ---------- Solicitudes ---------- */

export function EventsView({ data, fetchedAt, q, results }: { data: Summary; fetchedAt: string; q: string; results: Row[] | null }) {
  const now = new Date(fetchedAt).getTime();
  const [onlyErrors, setOnlyErrors] = useState(false);
  const source = results ?? data.events;
  const rows = onlyErrors ? source.filter((e) => Number(e.status_code) >= 400) : source;

  return (
    <>
      <Topbar page="Solicitudes" icon={Globe} hot={hotCount(data, now)} />
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-24 sm:px-8 lg:px-12">
        <PageTitle
          icon={Globe}
          title="Solicitudes"
          description={q ? `Resultados para «${q}» (IP que empieza así o ruta que lo contiene).` : "Las últimas 100 solicitudes de todos los servidores."}
        />
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          {q ? (
            <Link href="/solicitudes" className="inline-flex items-center gap-1.5 rounded-[4px] bg-(--n-blue-bg) px-2 py-1 text-[13px] text-(--n-blue-fg)">
              <span className="mono">{q}</span>
              <X size={13} strokeWidth={2} aria-label="Quitar filtro" />
            </Link>
          ) : <span />}
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
          rows={rows}
          empty={q ? "Nada coincide con esa búsqueda." : onlyErrors ? "Ninguna solicitud con error." : "Todavía no llegan solicitudes."}
          cols={[
            { key: "ts", label: "Cuándo", icon: Clock, render: (r) => <When ts={r.ts} now={now} /> },
            { key: "status_code", label: "Código", icon: Activity, render: (r) => (r.status_code == null ? "—" : <Tag tone={statusTone(Number(r.status_code))}>{String(r.status_code)}</Tag>) },
            { key: "method", label: "Método", icon: Hash, render: (r) => <Mono>{r.method}</Mono> },
            { key: "path", label: "Ruta", icon: Globe, render: (r) => <span className="mono block max-w-[340px] truncate" title={String(r.path ?? "")}>{r.path ?? "—"}</span> },
            { key: "client_ip", label: "IP", icon: Hash, render: (r) => <Mono>{r.client_ip}</Mono> },
            { key: "service", label: "Servicio", icon: Server, render: (r) => <span title={String(r.service ?? "")}>{serviceName(r.service)}</span> },
            { key: "duration_ms", label: "Duración", icon: Timer, align: "right", render: (r) => (r.duration_ms == null ? "—" : <span className="tabular text-(--muted)">{nf.format(Number(r.duration_ms))} ms</span>) },
          ]}
        />
      </main>
    </>
  );
}

/* ---------- IPs ---------- */

export function IpsView({ data, fetchedAt }: { data: Summary; fetchedAt: string }) {
  const now = new Date(fetchedAt).getTime();
  const max = Math.max(1, ...data.topIps.map((r) => Number(r.total)));
  return (
    <>
      <Topbar page="IPs" icon={Hash} hot={hotCount(data, now)} />
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-24 sm:px-8 lg:px-12">
        <PageTitle icon={Hash} title="IPs" description="Las 10 IPs con más solicitudes en las últimas 24 horas." />
        <Database
          label="IPs más activas"
          rows={data.topIps.map((r) => ({ ...r, id: r.client_ip }))}
          empty="Sin IPs en las últimas 24 horas."
          cols={[
            { key: "client_ip", label: "IP", icon: Hash, render: (r) => (
              <Link href={`/solicitudes?q=${encodeURIComponent(String(r.client_ip))}`} className="mono underline-offset-2 hover:underline">{r.client_ip}</Link>
            ) },
            { key: "total", label: "Solicitudes", icon: Activity, render: (r) => (
              <span className="flex items-center gap-3">
                <span className="tabular w-12 text-right">{nf.format(Number(r.total))}</span>
                <span className="h-1.5 w-40 overflow-hidden rounded-full bg-(--n-gray-bg)">
                  <span className="block h-full rounded-full bg-(--c-bar)" style={{ width: `${(Number(r.total) / max) * 100}%` }} />
                </span>
              </span>
            ) },
            { key: "errors", label: "Errores", icon: CircleAlert, align: "right", render: (r) => {
              const pct = Math.round((Number(r.errors ?? 0) / Math.max(1, Number(r.total))) * 100);
              return <span className="tabular text-(--muted)">{pct}%</span>;
            } },
            { key: "flag", label: "Incidentes", icon: ShieldAlert, render: (r) => {
              const n = data.incidents.filter((i) => i.client_ip === r.client_ip).length;
              return n ? <Tag tone="red">{n}</Tag> : <span className="text-(--muted)">—</span>;
            } },
          ]}
        />
      </main>
    </>
  );
}

/* ---------- Servidores ---------- */

export function ServersView({ data, fetchedAt }: { data: Summary; fetchedAt: string }) {
  const now = new Date(fetchedAt).getTime();
  return (
    <>
      <Topbar page="Servidores" icon={Server} hot={hotCount(data, now)} />
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-24 sm:px-8 lg:px-12">
        <PageTitle icon={Server} title="Servidores" description="Servidores registrados con su ingest key. «Enviando» = datos en los últimos 5 minutos." />
        <Database
          label="Servidores"
          rows={data.servers}
          empty="Ningún servidor registrado. Crea uno con: node ace server:create <nombre>"
          cols={[
            { key: "name", label: "Nombre", icon: Server, render: (r) => String(r.name) },
            { key: "state", label: "Estado", icon: Activity, render: (r) => (isOnline(r, now) ? <Tag tone="green">Enviando</Tag> : <Tag tone="gray">Sin señal</Tag>) },
            { key: "last_seen_at", label: "Último evento", icon: Clock, render: (r) => <When ts={r.last_seen_at} now={now} /> },
          ]}
        />
      </main>
    </>
  );
}
