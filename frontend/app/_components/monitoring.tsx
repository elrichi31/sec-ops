"use client";

import { useState } from "react";
import { Activity, Cpu, Gauge, HardDrive, MemoryStick, type LucideIcon } from "lucide-react";
import type { Monitoring, Summary } from "@/lib/api";
import { HourlyLines, Legend, type Series } from "./charts";
import { Topbar } from "./shell";
import { ONLINE_MS, PageTitle, ago, nf, type Row, type Tone, type Val } from "./ui";
import { Section, hotCount } from "./views";

const HOST_SERIES: Series[] = [
  { key: "cpu", label: "CPU", color: "var(--c-3xx)" },
  { key: "mem", label: "Memoria", color: "var(--c-4xx)" },
];

const bytes = (b: number) =>
  b < 1024 ** 3 ? `${nf.format(Math.round(b / 1024 ** 2))} MB` : `${nf.format(Math.round((b / 1024 ** 3) * 10) / 10)} GB`;

const pctOf = (a: number | null, b: number | null) => (a == null || !b ? null : (a / b) * 100);
const pctText = (p: number | null) => (p == null ? "—" : `${Math.round(p)}%`);
const level = (p: number | null): Tone => (p == null ? "gray" : p >= 90 ? "red" : p >= 75 ? "orange" : "green");
const warnColor = (p: number | null) => (level(p) === "red" || level(p) === "orange" ? { color: `var(--n-${level(p)}-fg)` } : undefined);

// Swarm tasks are "app.1.<task id>"; images may carry "@sha256:<digest>"
const containerName = (v: Val) => String(v).replace(/\.\d+\.[a-z0-9]{20,}$/, "");
const imageName = (v: Val) => (v ? String(v).replace(/@sha256:\w+$/, "") : "");

type Host = { row?: Row; n: (k: string) => number | null; cpu: number | null; mem: number | null; disk: number | null; fresh: boolean };

function host(row: Row | undefined, now: number): Host {
  const n = (k: string) => (row?.[k] == null ? null : Number(row[k]));
  return {
    row,
    n,
    cpu: n("cpu_pct"),
    mem: pctOf(n("mem_used"), n("mem_total")),
    disk: pctOf(n("disk_used"), n("disk_total")),
    fresh: !!row && now - new Date(String(row.ts)).getTime() < ONLINE_MS,
  };
}

const cores = (c: number | null) => (c ? `${c} núcleo${c === 1 ? "" : "s"}` : "—");

/** Usage bar: green, orange past 75 %, red past 90 %. */
function Bar({ pct, className = "h-1.5" }: { pct: number | null; className?: string }) {
  return (
    <span className={`block overflow-hidden rounded-full bg-(--n-gray-bg) ${className}`} aria-hidden>
      <span
        className="block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ width: `${Math.min(100, pct ? Math.max(pct, 2) : 0)}%`, background: `var(--n-${level(pct)}-fg)` }}
      />
    </span>
  );
}

/** Overview card; selecting it opens the server below. */
function ServerCard({ name, h, containers, selected, onSelect, now }: { name: string; h: Host; containers: number; selected: boolean; onSelect: () => void; now: number }) {
  const rows: [string, number | null][] = [["CPU", h.cpu], ["Memoria", h.mem], ["Disco", h.disk]];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`panel press w-full p-4 text-left ring-(--accent) transition-shadow ${selected ? "ring-2" : "hover:shadow-(--shadow-float)"}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className={`size-2 shrink-0 rounded-full ${h.fresh ? "live-dot bg-(--c-2xx)" : "bg-(--n-faint)"}`} aria-hidden />
          <span className="truncate text-[15px] font-semibold">{name}</span>
        </span>
        <span className="shrink-0 text-[12px] text-(--muted)">{!h.row ? "sin métricas" : h.fresh ? ago(h.row.ts, now) : "sin señal"}</span>
      </span>
      {h.row ? (
        <span className="mt-4 flex flex-col gap-2.5">
          {rows.map(([label, pct]) => (
            <span key={label} className="grid grid-cols-[4rem_1fr_2.5rem] items-center gap-2.5 text-[13px]">
              <span className="text-(--muted)">{label}</span>
              <Bar pct={pct} />
              <span className="tabular text-right font-medium" style={warnColor(pct)}>{pctText(pct)}</span>
            </span>
          ))}
        </span>
      ) : (
        <span className="mt-4 block text-[13px] text-(--muted)">El collector de este servidor aún no envía métricas.</span>
      )}
      <span className="mt-4 flex gap-3 border-t border-(--border) pt-3 text-[12px] text-(--muted)">
        <span>{cores(h.n("cpus"))}</span>
        {h.n("mem_total") ? <span>{bytes(h.n("mem_total")!)}</span> : null}
        <span className="ml-auto">{containers} contenedor{containers === 1 ? "" : "es"}</span>
      </span>
    </button>
  );
}

function Tile({ label, icon: Icon, pct, value, detail }: { label: string; icon: LucideIcon; pct: number | null; value: string; detail: string }) {
  return (
    <div className="panel min-w-0 p-4">
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-(--muted)">
        <Icon size={14} strokeWidth={2} className="text-(--accent)" aria-hidden />
        {label}
      </p>
      <p className="rounded-num tabular mt-2 text-[28px] leading-none font-semibold tracking-[-0.02em]" style={warnColor(pct)}>{value}</p>
      <Bar pct={pct} className="mt-3 h-2" />
      <p className="mt-2 truncate text-[12.5px] text-(--muted)">{detail}</p>
    </div>
  );
}

function ContainerList({ rows, memTotal }: { rows: Row[]; memTotal: number | null }) {
  const [sort, setSort] = useState<"mem_used" | "cpu_pct">("mem_used");
  const sorted = [...rows].sort((a, b) => Number(b[sort] ?? 0) - Number(a[sort] ?? 0));

  return (
    <Section
      title={`Contenedores · ${rows.length}`}
      className="mt-4"
      action={
        <div role="group" aria-label="Ordenar por" className="flex rounded-[9px] bg-(--n-hover) p-0.5 text-[12.5px] font-medium">
          {([["mem_used", "Memoria"], ["cpu_pct", "CPU"]] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={sort === k}
              onClick={() => setSort(k)}
              className="press h-7 rounded-[7px] px-3 text-(--muted) aria-pressed:bg-(--surface) aria-pressed:text-(--foreground) aria-pressed:shadow-(--shadow-card)"
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {sorted.length ? (
        <>
          <div className="-mx-2 grid grid-cols-[minmax(0,1fr)_3rem_6rem] gap-x-3 px-2 pb-1.5 text-[12px] font-semibold text-(--muted) sm:grid-cols-[minmax(0,1fr)_5rem_minmax(10rem,16rem)]" aria-hidden>
            <span>Contenedor</span>
            <span className="text-right">CPU</span>
            <span>Memoria</span>
          </div>
          <ul className="-mx-2 flex flex-col">
            {sorted.map((c) => {
              const mem = c.mem_used == null ? null : Number(c.mem_used);
              const memPct = pctOf(mem, memTotal);
              return (
                <li
                  key={String(c.name)}
                  className="grid grid-cols-[minmax(0,1fr)_3rem_6rem] items-center gap-x-3 rounded-lg border-t border-(--border) px-2 py-2.5 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_5rem_minmax(10rem,16rem)]"
                >
                  <span className="min-w-0">
                    <span className="mono block truncate text-[13px]" title={String(c.name)}>{containerName(c.name)}</span>
                    <span className="block truncate text-[12px] text-(--muted)" title={String(c.image ?? "")}>{imageName(c.image)}</span>
                  </span>
                  {/* docker stats style: 100 % = one full core */}
                  <span className="tabular text-right text-[13px]">{c.cpu_pct == null ? "—" : `${nf.format(Math.round(Number(c.cpu_pct) * 10) / 10)}%`}</span>
                  <span className="min-w-0">
                    <span className="flex items-baseline justify-between gap-2 text-[13px]">
                      <span className="tabular">{mem == null ? "—" : bytes(mem)}</span>
                      <span className="tabular text-[12px] text-(--muted)">{memPct == null ? "" : memPct < 1 ? "<1%" : `${Math.round(memPct)}%`}</span>
                    </span>
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-(--n-gray-bg)" aria-hidden>
                      <span className="block h-full rounded-full bg-(--c-bar)" style={{ width: `${Math.min(100, memPct ?? 0)}%` }} />
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[12px] text-(--muted)">CPU como en docker stats: 100 % es un núcleo completo. Memoria en % de la RAM del servidor.</p>
        </>
      ) : (
        <p className="py-6 text-sm text-(--muted)">Sin datos de contenedores. El collector necesita /var/run/docker.sock montado.</p>
      )}
    </Section>
  );
}

function ServerDetail({ name, h, hourly, containers }: { name: string; h: Host; hourly: Row[]; containers: Row[] }) {
  const { n } = h;
  const cpus = n("cpus");
  const load = [n("load1"), n("load5"), n("load15")];

  if (!h.row) {
    return (
      <section className="panel mt-6 p-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.015em]">{name}</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-(--muted)">
          Sin métricas todavía. Despliega el collector en este servidor con el <span className="mono">otelcol.yaml</span> actual y los volúmenes{" "}
          <span className="mono">/:/hostfs:ro</span> y <span className="mono">/var/run/docker.sock</span>.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8" aria-label={`Detalle de ${name}`}>
      <h2 className="mb-3 text-[22px] font-bold tracking-[-0.02em]">{name}</h2>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile label="CPU" icon={Cpu} pct={h.cpu} value={pctText(h.cpu)} detail={cores(cpus)} />
        <Tile label="Memoria" icon={MemoryStick} pct={h.mem} value={pctText(h.mem)} detail={n("mem_total") ? `${bytes(n("mem_used") ?? 0)} de ${bytes(n("mem_total")!)}` : "—"} />
        <Tile label="Disco /" icon={HardDrive} pct={h.disk} value={pctText(h.disk)} detail={n("disk_total") ? `${bytes(n("disk_used") ?? 0)} de ${bytes(n("disk_total")!)}` : "—"} />
        <Tile
          label="Carga"
          icon={Activity}
          pct={pctOf(load[0], cpus)}
          value={load[0] == null ? "—" : load[0].toFixed(2)}
          detail={load[1] == null ? "—" : `5 min ${load[1].toFixed(2)} · 15 min ${load[2]?.toFixed(2) ?? "—"}`}
        />
      </div>

      <Section title="CPU y memoria · 24 h" action={<Legend series={HOST_SERIES} />} className="mt-4">
        <div className="pt-12">
          <HourlyLines rows={hourly} series={HOST_SERIES} caption={`CPU y memoria por hora en ${name}, promedio`} unit="%" height={150} />
        </div>
      </Section>

      <ContainerList rows={containers} memTotal={n("mem_total")} />
    </section>
  );
}

export function MonitoringView({ data, monitoring, fetchedAt }: { data: Summary; monitoring: Monitoring; fetchedAt: string }) {
  const now = new Date(fetchedAt).getTime();
  const [picked, setPicked] = useState<Val>(null);
  const servers = data.servers;
  const selected = servers.find((s) => s.id === picked) ?? servers[0];
  const hostOf = (id: Val) => host(monitoring.latest.find((r) => r.server_id === id), now);
  const containersOf = (id: Val) => monitoring.containers.filter((c) => c.server_id === id);

  return (
    <>
      <Topbar page="Monitoreo" icon={Gauge} hot={hotCount(data, now)} />
      <main className="w-full px-4 pb-24 sm:px-6">
        <PageTitle title="Monitoreo" description="Recursos de cada servidor y sus contenedores, cada 30 segundos." />
        {selected ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {servers.map((s) => (
                <ServerCard
                  key={String(s.id)}
                  name={String(s.name)}
                  h={hostOf(s.id)}
                  containers={containersOf(s.id).length}
                  selected={s.id === selected.id}
                  onSelect={() => setPicked(s.id)}
                  now={now}
                />
              ))}
            </div>
            <ServerDetail
              key={String(selected.id)}
              name={String(selected.name)}
              h={hostOf(selected.id)}
              hourly={monitoring.hourly.filter((r) => r.server_id === selected.id)}
              containers={containersOf(selected.id)}
            />
          </>
        ) : (
          <p className="py-6 text-sm text-(--muted)">Ningún servidor registrado. Crea uno con: node ace server:create &lt;nombre&gt;</p>
        )}
      </main>
    </>
  );
}
