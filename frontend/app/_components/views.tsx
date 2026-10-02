"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRightLeft, Box, Cpu, MemoryStick, CircleAlert, CircleCheck, Clock, Gauge, Globe, Hash, LayoutGrid, Radio, Route, Server, ShieldAlert, ShieldCheck, Swords, Timer, X } from "lucide-react";
import type { Monitoring, Summary } from "@/lib/api";
import { BarList, HourlyBars, HourlyLines, INCIDENT_SERIES, LATENCY_SERIES, Legend, STATUS_SERIES, type Series } from "./charts";
import { Topbar } from "./shell";
import {
  Database,
  HOT_MS,
  Mono,
  PageTitle,
  Tag,
  When,
  isOnline,
  ONLINE_MS,
  nf,
  rule,
  serviceName,
  statusTone,
  type Col,
  type Row,
} from "./ui";

const hotCount = (d: Summary, now: number) =>
  d.incidents.filter((i) => now - new Date(String(i.created_at)).getTime() < HOT_MS).length;

function Section({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-[-0.015em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const SeeAll = ({ href }: { href: string }) => (
  <Link href={href} className="press text-[13px] font-medium text-(--accent) hover:opacity-80">Ver todo ›</Link>
);

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "red" | "green" }) {
  return (
    <div className="panel min-w-0 p-4">
      <p className="text-[13px] font-medium text-(--muted)">{label}</p>
      <p className="rounded-num tabular mt-2 text-[28px] leading-none font-semibold tracking-[-0.02em]" style={tone ? { color: `var(--n-${tone}-fg)` } : undefined}>
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
  { key: "sample_path", label: "Ruta", icon: Route, render: (r) => <Mono>{r.sample_path}</Mono> },
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

  const suspect = useMemo(() => {
    const byIp = new Map<string, number>();
    for (const i of hot) byIp.set(String(i.client_ip), (byIp.get(String(i.client_ip)) ?? 0) + Number(i.hits));
    return [...byIp.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [hot]);

  return (
    <>
      <Topbar page="Resumen" icon={LayoutGrid} hot={hot.length} />
      <main className="w-full px-4 pb-24 sm:px-6">
        <PageTitle title="Resumen" description="Todo lo que llegó a tus servidores en las últimas 24 horas." />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Stat label="Solicitudes" value={nf.format(requests)} hint="últimas 24 h" />
          <Stat
            label="Errores"
            value={requests ? `${Math.round((errors / requests) * 100)}%` : "—"}
            hint={`${nf.format(errors)} con código ≥ 400`}
          />
          <Stat label="IPs únicas" value={nf.format(Number(t.ips ?? 0))} hint="clientes distintos" />
          <Stat label="Incidentes" value={nf.format(incidents24)} hint={hot.length ? `${hot.length} en la última hora` : "ninguno en la última hora"} tone={hot.length ? "red" : undefined} />
          <Stat label="Latencia p95" value={t.p95_ms == null ? "—" : `${nf.format(Number(t.p95_ms))} ms`} hint={t.avg_ms == null ? "sin datos" : `media ${nf.format(Number(t.avg_ms))} ms`} />
          <Stat label="Sondeos" value={nf.format(Number(t.unrouted ?? 0))} hint="a hosts que no sirves" />
        </div>

        {suspect ? (
          <aside className="panel mt-4 flex items-start gap-3.5 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--n-red-bg)", color: "var(--n-red-fg)" }}>
              <CircleAlert size={19} strokeWidth={2} aria-hidden />
            </span>
            <p className="pt-1.5 text-[15px] leading-relaxed">
              La IP <span className="mono font-medium">{suspect[0]}</span> acumula <b className="tabular">{nf.format(suspect[1])}</b> solicitudes sospechosas en la última hora.{" "}
              <Link href={`/solicitudes?q=${encodeURIComponent(suspect[0])}`} className="font-medium text-(--accent) hover:underline">Ver su actividad</Link> y bloquéala en Cloudflare si no es tuya.
            </p>
          </aside>
        ) : (
          <aside className="panel mt-4 flex items-start gap-3.5 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--n-green-bg)", color: "var(--n-green-fg)" }}>
              <ShieldCheck size={19} strokeWidth={2} aria-hidden />
            </span>
            <p className="pt-1.5 text-[15px] leading-relaxed">Nada que atender ahora. Los detectores revisan escaneos 404, rutas sensibles y fuerza bruta cada minuto.</p>
          </aside>
        )}

        <Section title="Tráfico por hora" action={<Legend series={STATUS_SERIES} />} className="mt-4">
          <div className="pt-12">
            <HourlyBars rows={data.timeline} series={STATUS_SERIES} caption="Solicitudes por hora y clase de estado" />
          </div>
        </Section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Section title="Incidentes por hora">
            <div className="pt-12">
              <HourlyBars rows={data.timeline} series={INCIDENT_SERIES} caption="Incidentes por hora" height={140} />
            </div>
          </Section>
          <Section title="Latencia por hora" action={<Legend series={LATENCY_SERIES} />}>
            <div className="pt-12">
              <HourlyLines rows={data.timeline} series={LATENCY_SERIES} caption="Latencia p50 y p95 por hora, en milisegundos" unit=" ms" height={140} />
            </div>
          </Section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Section title="Incidentes por regla · 24 h" action={<SeeAll href="/incidentes" />}>
            <BarList rows={data.rules} empty="Ninguna regla se disparó en 24 horas." label={(r) => <Tag tone={rule(r.rule).tone}>{rule(r.rule).label}</Tag>} />
          </Section>
          <Section title="Rutas más atacadas · errores" action={<SeeAll href="/solicitudes" />}>
            <BarList rows={data.topPaths} mono empty="Sin errores en 24 horas." label={(r) => String(r.path)} href={(r) => `/solicitudes?q=${encodeURIComponent(String(r.path))}`} />
          </Section>
          <Section title="IPs más activas" action={<SeeAll href="/ips" />}>
            <BarList rows={data.topIps.slice(0, 8)} mono empty="Sin tráfico en 24 horas." label={(r) => String(r.client_ip)} href={(r) => `/solicitudes?q=${encodeURIComponent(String(r.client_ip))}`} />
          </Section>
          <Section title="Sondeos a hosts ajenos">
            <BarList
              rows={data.probes}
              mono
              empty="Nadie pidió hosts que no sirves."
              label={(r) => String(r.host)}
              hint={(r) => `${nf.format(Number(r.ips))} IP${Number(r.ips) === 1 ? "" : "s"}`}
              href={(r) => `/solicitudes?q=${encodeURIComponent(String(r.host))}`}
            />
          </Section>
          <Section title="Tus servicios">
            <BarList rows={data.services} empty="Sin tráfico enrutado en 24 horas." label={(r) => <span title={String(r.service)}>{serviceName(r.service)}</span>} />
          </Section>
          <Section title="Códigos HTTP">
            <BarList
              rows={data.statuses.filter((s) => s.status_code != null).sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 8)}
              empty="Sin tráfico en 24 horas."
              label={(r) => <Tag tone={statusTone(Number(r.status_code))}>{String(r.status_code)}</Tag>}
            />
          </Section>
          <Section title="Métodos">
            <BarList rows={data.methods} mono empty="Sin tráfico en 24 horas." label={(r) => String(r.method)} />
          </Section>
        </div>

        <Section title="Últimos incidentes" action={<SeeAll href="/incidentes" />} className="mt-4">
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
      <main className="flex h-[calc(100dvh-4rem)] min-h-[32rem] w-full flex-col px-4 pb-4 sm:px-6">
        <PageTitle title="Incidentes" description="Reglas que se dispararon. Cada IP avisa una vez cada 10 minutos por regla." />
        <Database fill label="Incidentes" rows={data.incidents} empty="Sin incidentes. Cuando una regla se dispare aparecerá aquí y en Telegram." cols={incidentCols(now)} />
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
      <main className="flex h-[calc(100dvh-4rem)] min-h-[32rem] w-full flex-col px-4 pb-4 sm:px-6">
        <PageTitle
          title="Solicitudes"
          description={q ? `Resultados para «${q}» (IP que empieza así, o host o ruta que lo contiene).` : "Las últimas 100 solicitudes de todos los servidores."}
        />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {q ? (
            <Link href="/solicitudes" className="press inline-flex h-8 items-center gap-1.5 rounded-full bg-(--n-blue-bg) px-3 text-[13px] font-medium text-(--n-blue-fg)">
              <span className="mono">{q}</span>
              <X size={13} strokeWidth={2} aria-label="Quitar filtro" />
            </Link>
          ) : <span />}
          <button
            type="button"
            aria-pressed={onlyErrors}
            onClick={() => setOnlyErrors((v) => !v)}
            className="press h-8 rounded-full bg-(--surface) px-3.5 text-[13px] font-medium shadow-(--shadow-card) hover:bg-(--n-hover) aria-pressed:bg-(--accent) aria-pressed:text-white"
          >
            Solo errores (≥ 400)
          </button>
        </div>
        <Database fill
          label="Solicitudes"
          rows={rows}
          empty={q ? "Nada coincide con esa búsqueda." : onlyErrors ? "Ninguna solicitud con error." : "Todavía no llegan solicitudes."}
          cols={[
            { key: "ts", label: "Cuándo", icon: Clock, render: (r) => <When ts={r.ts} now={now} /> },
            { key: "status_code", label: "Código", icon: CircleCheck, render: (r) => (r.status_code == null ? "—" : <Tag tone={statusTone(Number(r.status_code))}>{String(r.status_code)}</Tag>) },
            { key: "method", label: "Método", icon: ArrowRightLeft, render: (r) => <Mono>{r.method}</Mono> },
            { key: "path", label: "Ruta", icon: Route, render: (r) => <span className="mono block max-w-[340px] truncate" title={String(r.path ?? "")}>{r.path ?? "—"}</span> },
            { key: "attack", label: "Ataque", icon: Swords, render: (r) => (r.attack ? <Tag tone={rule(r.attack).tone}>{rule(r.attack).label}</Tag> : "—") },
            { key: "client_ip", label: "IP", icon: Hash, render: (r) => <Mono>{r.client_ip}</Mono> },
            { key: "service", label: "Servicio", icon: Box, render: (r) =>
              r.service ? <span title={String(r.service)}>{serviceName(r.service)}</span>
              : r.host ? <span className="inline-flex items-center gap-1.5"><Tag tone="gray">sin ruta</Tag><span className="mono text-(--muted)">{r.host}</span></span>
              : "—" },
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
      <main className="flex h-[calc(100dvh-4rem)] min-h-[32rem] w-full flex-col px-4 pb-4 sm:px-6">
        <PageTitle title="IPs" description="Las 10 IPs con más solicitudes en las últimas 24 horas." />
        <Database fill
          label="IPs más activas"
          rows={data.topIps.map((r) => ({ ...r, id: r.client_ip }))}
          empty="Sin IPs en las últimas 24 horas."
          cols={[
            { key: "client_ip", label: "IP", icon: Hash, render: (r) => (
              <Link href={`/solicitudes?q=${encodeURIComponent(String(r.client_ip))}`} className="mono text-(--accent) hover:underline">{r.client_ip}</Link>
            ) },
            { key: "total", label: "Solicitudes", icon: Globe, render: (r) => (
              <span className="flex items-center gap-3">
                <span className="tabular w-12 text-right">{nf.format(Number(r.total))}</span>
                <span className="h-2 w-20 overflow-hidden rounded-full sm:w-40 bg-(--n-gray-bg)">
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
      <main className="flex h-[calc(100dvh-4rem)] min-h-[32rem] w-full flex-col px-4 pb-4 sm:px-6">
        <PageTitle title="Servidores" description="Servidores registrados con su ingest key. «Enviando» = datos en los últimos 5 minutos." />
        <Database fill
          label="Servidores"
          rows={data.servers}
          empty="Ningún servidor registrado. Crea uno con: node ace server:create <nombre>"
          cols={[
            { key: "name", label: "Nombre", icon: Server, render: (r) => String(r.name) },
            { key: "state", label: "Estado", icon: Radio, render: (r) => (isOnline(r, now) ? <Tag tone="green">Enviando</Tag> : <Tag tone="gray">Sin señal</Tag>) },
            { key: "last_seen_at", label: "Último evento", icon: Clock, render: (r) => <When ts={r.last_seen_at} now={now} /> },
          ]}
        />
      </main>
    </>
  );
}

/* ---------- Monitoreo ---------- */

const HOST_SERIES: Series[] = [
  { key: "cpu", label: "CPU", color: "var(--c-3xx)" },
  { key: "mem", label: "RAM", color: "var(--c-4xx)" },
];

const gb = (b: number) =>
  b < 1024 ** 3 ? `${nf.format(Math.round(b / 1024 ** 2))} MB` : `${nf.format(Math.round((b / 1024 ** 3) * 10) / 10)} GB`;

/** Usage bar that turns orange past 75 % and red past 90 %. */
function Meter({ label, pct, detail }: { label: string; pct: number | null; detail: string }) {
  const tone = pct == null ? "gray" : pct >= 90 ? "red" : pct >= 75 ? "orange" : "green";
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium text-(--muted)">{label}</p>
        <p className="rounded-num tabular text-[22px] leading-none font-semibold tracking-[-0.02em]" style={tone === "gray" || tone === "green" ? undefined : { color: `var(--n-${tone}-fg)` }}>
          {pct == null ? "—" : `${Math.round(pct)}%`}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-(--n-gray-bg)" role="meter" aria-label={label} aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, pct ?? 0)}%`, background: `var(--n-${tone}-fg)` }} />
      </div>
      <p className="mt-1.5 truncate text-[12.5px] text-(--muted)">{detail}</p>
    </div>
  );
}

function ContainerTable({ rows }: { rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.mem_used ?? 0)));
  return (
    <Database
      label="Contenedores"
      rows={rows.map((r) => ({ ...r, id: r.name }))}
      empty="Sin datos de contenedores. El collector necesita /var/run/docker.sock montado."
      cols={[
        { key: "name", label: "Contenedor", icon: Box, render: (r) => (
          <span className="block max-w-[320px] truncate" title={String(r.image ?? "")}>
            <span className="mono">{r.name}</span>
            {r.image && <span className="ml-2 text-[12px] text-(--muted)">{r.image}</span>}
          </span>
        ) },
        // docker stats style: 100 % = one full core
        { key: "cpu_pct", label: "CPU", icon: Cpu, align: "right", render: (r) => (r.cpu_pct == null ? "—" : <span className="tabular">{nf.format(Math.round(Number(r.cpu_pct) * 10) / 10)}%</span>) },
        { key: "mem_used", label: "RAM", icon: MemoryStick, render: (r) => (
          <span className="flex items-center gap-3">
            <span className="tabular w-20 text-right">{r.mem_used == null ? "—" : gb(Number(r.mem_used))}</span>
            <span className="h-2 w-20 overflow-hidden rounded-full bg-(--n-gray-bg) sm:w-40">
              <span className="block h-full rounded-full bg-(--c-bar)" style={{ width: `${(Number(r.mem_used ?? 0) / max) * 100}%` }} />
            </span>
          </span>
        ) },
      ]}
    />
  );
}

export function MonitoringView({ data, monitoring, fetchedAt }: { data: Summary; monitoring: Monitoring; fetchedAt: string }) {
  const now = new Date(fetchedAt).getTime();
  return (
    <>
      <Topbar page="Monitoreo" icon={Gauge} hot={hotCount(data, now)} />
      <main className="w-full px-4 pb-24 sm:px-6">
        <PageTitle title="Monitoreo" description="CPU, RAM, carga, disco y contenedores de cada servidor. Se actualiza cada 30 segundos." />
        {!data.servers.length && <p className="py-6 text-sm text-(--muted)">Ningún servidor registrado.</p>}
        <div className="flex flex-col gap-4">
          {data.servers.map((s) => {
            const m = monitoring.latest.find((r) => r.server_id === s.id);
            const n = (k: string) => (m?.[k] == null ? null : Number(m[k]));
            const pct = (a: number | null, b: number | null) => (a == null || !b ? null : (a / b) * 100);
            const cpus = n("cpus");
            const load = [n("load1"), n("load5"), n("load15")];
            const fresh = m && now - new Date(String(m.ts)).getTime() < ONLINE_MS;
            return (
              <Section
                key={String(s.id)}
                title={String(s.name)}
                action={m ? <span className="text-[13px] text-(--muted)">{fresh ? <Tag tone="green">En línea</Tag> : <Tag tone="gray">Sin señal</Tag>} <When ts={m.ts} now={now} /></span> : undefined}
              >
                {m ? (
                  <>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                      <Meter label="CPU" pct={n("cpu_pct")} detail={cpus ? `${cpus} núcleo${cpus === 1 ? "" : "s"}` : "—"} />
                      <Meter label="RAM" pct={pct(n("mem_used"), n("mem_total"))} detail={n("mem_total") ? `${gb(n("mem_used") ?? 0)} de ${gb(n("mem_total")!)}` : "—"} />
                      <Meter label="Disco /" pct={pct(n("disk_used"), n("disk_total"))} detail={n("disk_total") ? `${gb(n("disk_used") ?? 0)} de ${gb(n("disk_total")!)}` : "—"} />
                      <Meter
                        label="Carga 1 min"
                        pct={pct(load[0], cpus)}
                        detail={load[0] == null ? "—" : `${load.map((l) => (l == null ? "—" : l.toFixed(2))).join(" · ")} (1 · 5 · 15 min)`}
                      />
                    </div>
                    <div className="mt-6 flex items-baseline justify-between gap-3">
                      <h3 className="text-[15px] font-semibold">Últimas 24 h · promedio por hora</h3>
                      <Legend series={HOST_SERIES} />
                    </div>
                    <div className="pt-10">
                      <HourlyLines rows={monitoring.hourly.filter((r) => r.server_id === s.id)} series={HOST_SERIES} caption={`CPU y RAM por hora en ${s.name}`} unit="%" height={140} />
                    </div>
                    <h3 className="mt-6 mb-3 text-[15px] font-semibold">Contenedores · por RAM</h3>
                    <ContainerTable rows={monitoring.containers.filter((c) => c.server_id === s.id)} />
                  </>
                ) : (
                  <p className="py-4 text-sm text-(--muted)">
                    Sin métricas todavía. Actualiza el collector de este servidor (nuevo <span className="mono">otelcol.yaml</span> y el volumen <span className="mono">/:/hostfs:ro</span>).
                  </p>
                )}
              </Section>
            );
          })}
        </div>
      </main>
    </>
  );
}
