import { test } from '@japa/runner'
import { containerSnapshot, hostSnapshot } from '#services/host_metrics'

const dp = (value: number, state?: string, cpu?: string) => ({
  timeUnixNano: '1790000000000000000',
  asDouble: value,
  attributes: [
    ...(state ? [{ key: 'state', value: { stringValue: state } }] : []),
    ...(cpu ? [{ key: 'cpu', value: { stringValue: cpu } }] : []),
  ],
})

test('reduces a hostmetrics scrape to one row', ({ assert }) => {
  const row = hostSnapshot([
    {
      scopeMetrics: [
        {
          metrics: [
            { name: 'system.cpu.utilization', gauge: { dataPoints: [dp(0.8, 'idle', 'cpu0'), dp(0.2, 'user', 'cpu0'), dp(0.4, 'idle', 'cpu1')] } },
            { name: 'system.cpu.load_average.1m', gauge: { dataPoints: [dp(1.5)] } },
            { name: 'system.memory.usage', sum: { dataPoints: [dp(300, 'used'), dp(700, 'free')] } },
            { name: 'system.memory.limit', sum: { dataPoints: [{ asInt: '1000' }] } },
            { name: 'system.filesystem.usage', sum: { dataPoints: [dp(40, 'used'), dp(50, 'free'), dp(10, 'reserved')] } },
          ],
        },
      ],
    },
  ])
  assert.closeTo(row.cpu_pct!, 40, 0.001)
  assert.equal(row.cpus, 2)
  assert.equal(row.load1, 1.5)
  assert.isNull(row.load5)
  assert.equal(row.mem_used, 300)
  assert.equal(row.mem_total, 1000)
  assert.equal(row.disk_used, 40)
  assert.equal(row.disk_total, 100)
  assert.equal(row.ts.getTime(), 1790000000000)
})

test('reads one row per docker_stats container resource', ({ assert }) => {
  const res = (name: string) => ({
    resource: {
      attributes: [
        { key: 'container.name', value: { stringValue: name } },
        { key: 'container.image.name', value: { stringValue: 'postgres:17' } },
      ],
    },
    scopeMetrics: [
      {
        metrics: [
          { name: 'container.cpu.utilization', gauge: { dataPoints: [dp(12.5)] } },
          { name: 'container.memory.usage.total', sum: { dataPoints: [dp(512)] } },
        ],
      },
    ],
  })
  const rows = containerSnapshot([res('/db'), res('api'), { scopeMetrics: [] }])
  assert.deepEqual(
    rows.map((r) => r.name),
    ['db', 'api']
  )
  assert.equal(rows[0].cpu_pct, 12.5)
  assert.equal(rows[0].mem_used, 512)
  assert.isNull(rows[0].mem_limit)
  assert.equal(rows[0].image, 'postgres:17')
})
