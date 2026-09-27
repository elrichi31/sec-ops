"use client";

import { useState } from "react";
import { nf, type Row } from "./ui";

export type Series = { key: string; label: string; color: string };

export const STATUS_SERIES: Series[] = [
  { key: "s2", label: "2xx", color: "var(--c-2xx)" },
  { key: "s3", label: "3xx", color: "var(--c-3xx)" },
  { key: "s4", label: "4xx", color: "var(--c-4xx)" },
  { key: "s5", label: "5xx", color: "var(--c-5xx)" },
];
export const INCIDENT_SERIES: Series[] = [{ key: "incidents", label: "Incidentes", color: "var(--c-5xx)" }];
export const LATENCY_SERIES: Series[] = [
  { key: "p50", label: "p50", color: "var(--c-3xx)" },
  { key: "p95", label: "p95", color: "var(--c-5xx)" },
];

const hour = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });
const hourRange = (d: Date) => `${hour.format(d)} – ${hour.format(new Date(d.getTime() + 3600_000))}`;

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].find((m) => m * p >= v)! * p;
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-(--muted)">
      {series.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-[2px]" style={{ background: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

type Point = { hour: Date; values: (number | null)[] };
const toPoints = (rows: Row[], series: Series[]): Point[] =>
  rows.map((r) => ({
    hour: new Date(String(r.hour)),
    values: series.map((s) => (r[s.key] == null ? null : Number(r[s.key]))),
  }));

function YAxis({ ticks, max, height, unit = "" }: { ticks: number[]; max: number; height: number; unit?: string }) {
  return (
    <div className="relative w-9 shrink-0 text-right text-[11px] text-(--muted)" style={{ height }} aria-hidden>
      {ticks.map((t) => (
        <span key={t} className="tabular absolute right-0 -translate-y-1/2 whitespace-nowrap" style={{ top: `${(1 - t / max) * 100}%` }}>
          {nf.format(t)}{unit}
        </span>
      ))}
    </div>
  );
}

function Grid({ ticks, max, height }: { ticks: number[]; max: number; height: number }) {
  return (
    <>
      {ticks.map((t) => (
        <div key={t} className="absolute inset-x-0 border-t border-(--border)" style={{ top: `${(1 - t / max) * height}px` }} aria-hidden />
      ))}
    </>
  );
}

function XAxis({ points }: { points: Point[] }) {
  return (
    <div className="mt-2 flex justify-between text-[11px] text-(--muted)" aria-hidden>
      {points.filter((_, i) => i % 6 === 0).map((d) => (
        <span key={d.hour.getTime()} className="tabular">{hour.format(d.hour)}</span>
      ))}
      <span>ahora</span>
    </div>
  );
}

function Tooltip({ point, series, index, count, unit = "", total }: { point: Point; series: Series[]; index: number; count: number; unit?: string; total?: boolean }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute -top-2 z-10 w-40 -translate-y-full rounded-md border border-(--border) bg-(--background) px-3 py-2 text-[12.5px] shadow-[0_6px_20px_rgba(15,15,15,0.12)]"
      style={{ left: `clamp(0px, calc(${((index + 0.5) / count) * 100}% - 80px), calc(100% - 160px))` }}
    >
      <p className="mb-1.5 font-medium">{hourRange(point.hour)}</p>
      {series.map((s, j) => (
        <p key={s.key} className="flex items-center justify-between gap-3 text-(--muted)">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-[2px]" style={{ background: s.color }} aria-hidden />
            {s.label}
          </span>
          <span className="tabular text-(--foreground)">{point.values[j] == null ? "—" : `${nf.format(point.values[j]!)}${unit}`}</span>
        </p>
      ))}
      {total && series.length > 1 && (
        <p className="mt-1.5 flex justify-between border-t border-(--border) pt-1.5">
          <span className="text-(--muted)">Total</span>
          <span className="tabular font-medium">{nf.format(point.values.reduce<number>((a, b) => a + (b ?? 0), 0))}</span>
        </p>
      )}
    </div>
  );
}

function SrTable({ caption, points, series }: { caption: string; points: Point[]; series: Series[] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>Hora</th>
          {series.map((s) => <th key={s.key}>{s.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {points.map((d) => (
          <tr key={d.hour.getTime()}>
            <td>{hour.format(d.hour)}</td>
            {d.values.map((v, j) => <td key={j}>{v ?? "—"}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Hourly bars for the last 24 h; stacked when there is more than one series. */
export function HourlyBars({ rows, series, caption, height = 180 }: { rows: Row[]; series: Series[]; caption: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const points = toPoints(rows, series);
  const max = niceMax(Math.max(0, ...points.map((d) => d.values.reduce<number>((a, b) => a + (b ?? 0), 0))));
  const ticks = [max, max / 2, 0];

  return (
    <figure>
      <div className="flex gap-2">
        <YAxis ticks={ticks} max={max} height={height} />
        <div className="relative min-w-0 flex-1">
          <Grid ticks={ticks} max={max} height={height} />
          <div className="relative flex items-end gap-[3px]" style={{ height }} onMouseLeave={() => setHover(null)}>
            {points.map((d, i) => {
              const total = d.values.reduce<number>((a, b) => a + (b ?? 0), 0);
              const top = d.values.findLastIndex((v) => (v ?? 0) > 0);
              return (
                <div
                  key={i}
                  className="relative flex h-full flex-1 flex-col-reverse"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${hourRange(d.hour)}: ${nf.format(total)}`}
                >
                  <div className={`absolute inset-0 rounded-[3px] ${hover === i ? "bg-(--n-hover)" : ""}`} aria-hidden />
                  {d.values.map((v, s) =>
                    v ? (
                      <div
                        key={s}
                        className={`relative mt-[2px] w-full ${s === top ? "rounded-t-[4px]" : ""}`}
                        style={{ height: `${(v / max) * height}px`, background: series[s].color, minHeight: 2 }}
                      />
                    ) : null,
                  )}
                </div>
              );
            })}
            {hover !== null && <Tooltip point={points[hover]} series={series} index={hover} count={points.length} total />}
          </div>
          <XAxis points={points} />
        </div>
      </div>
      <SrTable caption={caption} points={points} series={series} />
    </figure>
  );
}

/** Hourly lines (one shared axis) with a crosshair tooltip. Hours with no data leave a gap. */
export function HourlyLines({ rows, series, caption, unit = "", height = 180 }: { rows: Row[]; series: Series[]; caption: string; unit?: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const points = toPoints(rows, series);
  const max = niceMax(Math.max(0, ...points.flatMap((d) => d.values.map((v) => v ?? 0))));
  const ticks = [max, max / 2, 0];
  const n = points.length;
  const x = (i: number) => ((i + 0.5) / n) * 100;
  const y = (v: number) => (1 - v / max) * height;

  const paths = series.map((_, s) => {
    let d = "";
    let pen = false;
    points.forEach((p, i) => {
      const v = p.values[s];
      if (v == null) return void (pen = false);
      d += `${pen ? "L" : "M"}${x(i)},${y(v)} `;
      pen = true;
    });
    return d;
  });
  const lonely = (s: number) => points.map((p, i) => ({ i, v: p.values[s] })).filter(({ i, v }) => v != null && points[i - 1]?.values[s] == null && points[i + 1]?.values[s] == null);

  return (
    <figure>
      <div className="flex gap-2">
        <YAxis ticks={ticks} max={max} height={height} unit={unit} />
        <div className="relative min-w-0 flex-1" onMouseLeave={() => setHover(null)}>
          <Grid ticks={ticks} max={max} height={height} />
          <svg className="relative block w-full overflow-visible" style={{ height }} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={height} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
            {paths.map((d, s) => (
              <path key={s} d={d} fill="none" stroke={series[s].color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          {/* markers in HTML so they stay round under the non-uniform SVG scale */}
          {series.map((s, si) =>
            [...new Map([...lonely(si), ...(hover !== null && points[hover].values[si] != null ? [{ i: hover, v: points[hover].values[si] }] : [])].map((m) => [m.i, m])).values()].map(({ i, v }) => (
              <span
                key={`${s.key}-${i}`}
                className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-(--background)"
                style={{ left: `${x(i)}%`, top: y(v!), background: s.color }}
                aria-hidden
              />
            )),
          )}
          <div className="absolute inset-x-0 top-0 flex" style={{ height }}>
            {points.map((d, i) => (
              <div key={i} className="h-full flex-1" tabIndex={0} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} aria-label={hourRange(d.hour)} />
            ))}
          </div>
          {hover !== null && <Tooltip point={points[hover]} series={series} index={hover} count={n} unit={unit} />}
          <XAxis points={points} />
        </div>
      </div>
      <SrTable caption={caption} points={points} series={series} />
    </figure>
  );
}

/** Ranked horizontal bars: label, bar, value. One hue; identity lives in the label. */
export function BarList({
  rows,
  label,
  value = (r) => Number(r.total),
  hint,
  empty,
  mono,
  href,
}: {
  rows: Row[];
  label: (r: Row) => React.ReactNode;
  value?: (r: Row) => number;
  hint?: (r: Row) => string;
  empty: string;
  mono?: boolean;
  href?: (r: Row) => string;
}) {
  if (!rows.length) return <p className="py-6 text-sm text-(--muted)">{empty}</p>;
  const max = Math.max(1, ...rows.map(value));
  return (
    <ul className="flex flex-col">
      {rows.map((r, i) => {
        const v = value(r);
        const inner = (
          <>
            <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2">
              <span className={`truncate ${mono ? "mono" : ""}`}>{label(r)}</span>
              {hint && <span className="shrink-0 text-[12px] text-(--muted)">{hint(r)}</span>}
            </span>
            <span className="tabular relative z-10 pl-3 text-(--muted)">{nf.format(v)}</span>
            <span className="absolute inset-y-[3px] left-0 rounded-r-[4px] opacity-[0.16]" style={{ width: `${(v / max) * 100}%`, background: "var(--c-bar)" }} aria-hidden />
          </>
        );
        const cls = "relative flex h-8 items-center px-2 text-sm";
        return (
          <li key={i}>
            {href ? <a href={href(r)} className={`${cls} rounded-md hover:bg-(--n-hover)`}>{inner}</a> : <div className={cls}>{inner}</div>}
          </li>
        );
      })}
    </ul>
  );
}
