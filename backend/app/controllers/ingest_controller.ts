import { createHash } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { resolveClientIp } from '#services/client_ip'
import { classifyRequest } from '#services/attack_classifier'
import { containerSnapshot, hostSnapshot } from '#services/host_metrics'
import type { HttpContext } from '@adonisjs/core/http'

type OtlpValue = { stringValue?: string; intValue?: string | number; doubleValue?: number }
type OtlpAttr = { key: string; value: OtlpValue }

const flatten = (attrs: OtlpAttr[] = []) =>
  Object.fromEntries(
    attrs.map(({ key, value }) => [key, value.stringValue ?? value.intValue ?? value.doubleValue])
  )

const int = (v: unknown) => (v === undefined || v === null || v === '' ? null : Math.trunc(Number(v)) || 0)
const str = (v: unknown, max = 2048) => (v === undefined || v === null ? null : String(v).slice(0, max))

async function serverFor({ request, response }: HttpContext) {
  const key = request.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (!key) return void response.unauthorized({ error: 'missing ingest key' })

  const hash = createHash('sha256').update(key).digest('hex')
  const server = await db.from('servers').where('ingest_key_hash', hash).first()
  if (!server) return void response.unauthorized({ error: 'invalid ingest key' })
  return server
}

/**
 * Receives OTLP/HTTP JSON (POST /v1/logs, /v1/metrics) from any collector.
 * Normalization happens in the collector; here we only map the common fields.
 */
export default class IngestController {
  async logs(ctx: HttpContext) {
    const { request } = ctx
    const server = await serverFor(ctx)
    if (!server) return

    const rows = []
    for (const rl of request.input('resourceLogs', [])) {
      const resource = flatten(rl.resource?.attributes)
      for (const sl of rl.scopeLogs ?? []) {
        for (const rec of sl.logRecords ?? []) {
          const a = { ...resource, ...flatten(rec.attributes) }
          const nanos = rec.timeUnixNano ?? rec.observedTimeUnixNano
          const path = str(a.path)
          const userAgent = str(a.userAgent, 512)
          rows.push({
            ts: nanos && nanos !== '0' ? new Date(Number(BigInt(nanos) / 1_000_000n)) : new Date(),
            server_id: server.id,
            source: str(a.source, 64) ?? 'unknown',
            service: str(a.service ?? a['service.name'], 255),
            host: str(a.host, 255),
            client_ip: resolveClientIp(str(a.clientIp, 64), str(a.cfConnectingIp, 64)),
            method: str(a.method, 16),
            path,
            status_code: int(a.statusCode),
            duration_ms: int(a.durationMs),
            user_agent: userAgent,
            attack: classifyRequest(path, userAgent),
          })
        }
      }
    }

    if (rows.length) await db.table('events').multiInsert(rows)
    await db.from('servers').where('id', server.id).update({ last_seen_at: new Date() })
    return {}
  }

  /** hostmetrics scrape -> host_metrics row, docker_stats -> container_metrics; old rows are dropped on the way. */
  async metrics(ctx: HttpContext) {
    const server = await serverFor(ctx)
    if (!server) return

    const resourceMetrics = ctx.request.input('resourceMetrics', [])
    const row = hostSnapshot(resourceMetrics)
    if (row.cpu_pct !== null || row.mem_total !== null) {
      await db.table('host_metrics').insert({ ...row, server_id: server.id })
    }
    const containers = containerSnapshot(resourceMetrics).map((c) => ({ ...c, server_id: server.id }))
    if (containers.length) {
      await db.knexQuery().table('container_metrics').insert(containers).onConflict(['server_id', 'name']).merge()
    }
    await db.from('container_metrics').where('server_id', server.id).where('ts', '<', new Date(Date.now() - 86400_000)).delete()
    await db.from('host_metrics').where('server_id', server.id).where('ts', '<', new Date(Date.now() - 7 * 86400_000)).delete()
    await db.from('servers').where('id', server.id).update({ last_seen_at: new Date() })
    return {}
  }
}
