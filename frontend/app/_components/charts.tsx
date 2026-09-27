"use client";

import { useState } from "react";
import { nf, type Row } from "./ui";

const SERIES = [
  { key: "s2", label: "2xx", color: "var(--c-2xx)" },
  { key: "s3", label: "3xx", color: "var(--c-3xx)" },
  { key: "s4", label: "4xx", color: "var(--c-4xx)" },
  { key: "s5", label: "5xx", color: "var(--c-5xx)" },
] as const;

const hour = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = [1, 2, 2.5, 5, 10].find((m) => m * p >= v)!;
  return n * p;
}

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-(--muted)">
      {SERIES.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-[2px]" style={{ background: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/** Requests per hour for the last 24 h, stacked by status class. */
export function TrafficChart({ rows }: { rows: Row[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = rows.map((r) => ({
    hour: new Date(String(r.hour)),
    values: SERIES.map((s) => Number(r[s.key] ?? 0)),
  }));
  const max = niceMax(Math.max(0, ...data.map((d) => d.values.reduce((a, b) => a + b, 0))));
  const ticks = [max, max / 2, 0];
  const H = 180;

  return (
    <figure>
      <div className="flex gap-2">
        <div className="relative w-8 shrink-0 text-right text-[11px] text-(--muted)" style={{ height: H }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="tabular absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
              {nf.format(t)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-(--border)" style={{ top: `${(1 - t / max) * H}px` }} aria-hidden />
          ))}

          <div className="relative flex items-end gap-[3px]" style={{ height: H }} onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => {
              const total = d.values.reduce((a, b) => a + b, 0);
              const top = d.values.findLastIndex((v) => v > 0);
              return (
                <div
                  key={i}
                  className="group relative flex h-full flex-1 flex-col-reverse justify-start"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${hour.format(d.hour)}: ${nf.format(total)} solicitudes`}
                >
                  <div className={`absolute inset-0 rounded-[3px] ${hover === i ? "bg-(--n-hover)" : ""}`} aria-hidden />
                  {d.values.map((v, s) =>
                    v ? (
                      <div
                        key={s}
                        className={`relative mt-[2px] w-full ${s === top ? "rounded-t-[4px]" : ""}`}
                        style={{ height: `${(v / max) * H}px`, background: SERIES[s].color, minHeight: 2 }}
                      />
                    ) : null,
                  )}
                </div>
              );
            })}

            {hover !== null && (
              <div
                role="tooltip"
                className="pointer-events-none absolute -top-2 z-10 w-40 -translate-y-full rounded-md border border-(--border) bg-(--background) px-3 py-2 text-[12.5px] shadow-[0_6px_20px_rgba(15,15,15,0.12)]"
                style={{ left: `clamp(0px, calc(${((hover + 0.5) / data.length) * 100}% - 80px), calc(100% - 160px))` }}
              >
                <p className="mb-1.5 font-medium">
                  {hour.format(data[hover].hour)} – {hour.format(new Date(data[hover].hour.getTime() + 3600_000))}
                </p>
                {SERIES.map((s, j) => (
                  <p key={s.key} className="flex items-center justify-between gap-3 text-(--muted)">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-[2px]" style={{ background: s.color }} aria-hidden />
                      {s.label}
                    </span>
                    <span className="tabular text-(--foreground)">{nf.format(data[hover].values[j])}</span>
                  </p>
                ))}
                <p className="mt-1.5 flex justify-between border-t border-(--border) pt-1.5">
                  <span className="text-(--muted)">Total</span>
                  <span className="tabular font-medium">{nf.format(data[hover].values.reduce((a, b) => a + b, 0))}</span>
                </p>
              </div>
            )}
          </div>

          <div className="mt-2 flex justify-between text-[11px] text-(--muted)" aria-hidden>
            {data.filter((_, i) => i % 6 === 0).map((d) => (
              <span key={d.hour.getTime()} className="tabular">{hour.format(d.hour)}</span>
            ))}
            <span>ahora</span>
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Solicitudes por hora y clase de estado</caption>
        <thead>
          <tr>
            <th>Hora</th>
            {SERIES.map((s) => <th key={s.key}>{s.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.hour.getTime()}>
              <td>{hour.format(d.hour)}</td>
              {d.values.map((v, j) => <td key={j}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Ranked horizontal bars: label, bar, value. One hue; identity lives in the label. */
export function BarList({
  rows,
  label,
  value = (r) => Number(r.total),
  empty,
  mono,
  href,
}: {
  rows: Row[];
  label: (r: Row) => React.ReactNode;
  value?: (r: Row) => number;
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
            <span className="relative z-10 flex min-w-0 flex-1 items-center">
              <span className={`truncate ${mono ? "mono" : ""}`}>{label(r)}</span>
            </span>
            <span className="tabular relative z-10 pl-3 text-(--muted)">{nf.format(v)}</span>
            <span
              className="absolute inset-y-[3px] left-0 rounded-r-[4px] opacity-[0.16]"
              style={{ width: `${(v / max) * 100}%`, background: "var(--c-bar)" }}
              aria-hidden
            />
          </>
        );
        const cls = "relative flex h-8 items-center px-2 text-sm";
        return (
          <li key={i}>
            {href ? (
              <a href={href(r)} className={`${cls} rounded-md hover:bg-(--n-hover)`}>{inner}</a>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
