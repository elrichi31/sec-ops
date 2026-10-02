type OtlpAttr = { key: string; value: { stringValue?: string } }
type DataPoint = { attributes?: OtlpAttr[]; timeUnixNano?: string; asDouble?: number; asInt?: string | number }
type Metric = { name: string; gauge?: { dataPoints?: DataPoint[] }; sum?: { dataPoints?: DataPoint[] } }
type ResourceMetrics = { resource?: { attributes?: OtlpAttr[] }; scopeMetrics?: { metrics?: Metric[] }[] }

/**
 * Reduces one hostmetrics scrape (OTLP/JSON resourceMetrics) to a single host_metrics row.
 * Needs the cpu (system.cpu.utilization), memory (+ system.memory.limit), load and filesystem scrapers.
 */
export function hostSnapshot(resourceMetrics: ResourceMetrics[]) {
  const points = new Map<string, { state?: string; value: number; ts?: string }[]>()
  for (const rm of resourceMetrics)
    for (const sm of rm.scopeMetrics ?? [])
      for (const m of sm.metrics ?? []) {
        const list = points.get(m.name) ?? []
        for (const dp of (m.gauge ?? m.sum)?.dataPoints ?? []) {
          const state = dp.attributes?.find((a) => a.key === 'state')?.value.stringValue
          list.push({ state, value: Number(dp.asDouble ?? dp.asInt), ts: dp.timeUnixNano })
        }
        points.set(m.name, list)
      }

  const get = (name: string) => points.get(name) ?? []
  const first = (name: string) => get(name)[0]?.value ?? null
  const sum = (name: string, state?: string) => {
    const list = get(name).filter((p) => !state || p.state === state)
    return list.length ? list.reduce((a, p) => a + p.value, 0) : null
  }

  // utilization comes per cpu and state; busy = 1 - idle, averaged over cpus
  const idle = get('system.cpu.utilization').filter((p) => p.state === 'idle')
  const nanos = [...points.values()].flat().find((p) => p.ts && p.ts !== '0')?.ts

  return {
    ts: nanos ? new Date(Number(BigInt(nanos) / 1_000_000n)) : new Date(),
    cpu_pct: idle.length ? Math.max(0, 100 * (1 - idle.reduce((a, p) => a + p.value, 0) / idle.length)) : null,
    cpus: idle.length || null,
    load1: first('system.cpu.load_average.1m'),
    load5: first('system.cpu.load_average.5m'),
    load15: first('system.cpu.load_average.15m'),
    mem_used: sum('system.memory.usage', 'used'),
    mem_total: first('system.memory.limit'),
    disk_used: sum('system.filesystem.usage', 'used'),
    disk_total: sum('system.filesystem.usage'),
  }
}

/** docker_stats scrape -> one row per container (each container is its own resource). */
export function containerSnapshot(resourceMetrics: ResourceMetrics[]) {
  return resourceMetrics.flatMap((rm) => {
    const attr = (k: string) => rm.resource?.attributes?.find((a) => a.key === k)?.value.stringValue
    const name = attr('container.name')
    if (!name) return []
    const metrics = (rm.scopeMetrics ?? []).flatMap((sm) => sm.metrics ?? [])
    const dp = (n: string) => {
      const m = metrics.find((x) => x.name === n)
      return (m?.gauge ?? m?.sum)?.dataPoints?.[0]
    }
    const value = (n: string) => {
      const p = dp(n)
      return p ? Number(p.asDouble ?? p.asInt) : null
    }
    const nanos = dp('container.memory.usage.total')?.timeUnixNano
    return [
      {
        name: name.replace(/^\//, '').slice(0, 255),
        image: attr('container.image.name')?.slice(0, 255) ?? null,
        ts: nanos && nanos !== '0' ? new Date(Number(BigInt(nanos) / 1_000_000n)) : new Date(),
        cpu_pct: value('container.cpu.utilization'),
        mem_used: value('container.memory.usage.total'),
        mem_limit: value('container.memory.usage.limit'),
      },
    ]
  })
}
