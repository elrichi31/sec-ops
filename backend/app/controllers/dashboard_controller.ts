import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'

const DAY = 24 * 3600_000

export default class DashboardController {
  async summary({}: HttpContext) {
    const since = new Date(Date.now() - DAY)
    const recent = () => db.from('events').where('ts', '>=', since)

    const [servers, statuses, topIps, events, incidents, timeline, rules, topPaths, services, totals] =
      await Promise.all([
        db.from('servers').select('id', 'name', 'last_seen_at').orderBy('name'),
        recent().select('status_code').count('* as total').groupBy('status_code').orderBy('status_code'),
        recent()
          .whereNotNull('client_ip')
          .select('client_ip')
          .count('* as total')
          .select(db.raw('count(*) filter (where status_code >= 400) as errors'))
          .groupBy('client_ip')
          .orderBy('total', 'desc')
          .limit(10),
        db
          .from('events')
          .join('servers', 'servers.id', 'events.server_id')
          .select('events.*', 'servers.name as server')
          .orderBy('events.ts', 'desc')
          .limit(100),
        db
          .from('incidents')
          .join('servers', 'servers.id', 'incidents.server_id')
          .select('incidents.*', 'servers.name as server')
          .orderBy('incidents.created_at', 'desc')
          .limit(50),
        // 24 hourly buckets, zero-filled, split by status class
        db.rawQuery(
          `SELECT h AS hour,
                  count(e.id) FILTER (WHERE e.status_code BETWEEN 200 AND 299) AS s2,
                  count(e.id) FILTER (WHERE e.status_code BETWEEN 300 AND 399) AS s3,
                  count(e.id) FILTER (WHERE e.status_code BETWEEN 400 AND 499) AS s4,
                  count(e.id) FILTER (WHERE e.status_code >= 500) AS s5
           FROM generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') h
           LEFT JOIN events e ON e.ts >= h AND e.ts < h + interval '1 hour'
           GROUP BY h ORDER BY h`
        ),
        db.from('incidents').where('created_at', '>=', since).select('rule').count('* as total').groupBy('rule'),
        recent()
          .where('status_code', '>=', 400)
          .whereNotNull('path')
          .select('path')
          .count('* as total')
          .groupBy('path')
          .orderBy('total', 'desc')
          .limit(8),
        recent().whereNotNull('service').select('service').count('* as total').groupBy('service').orderBy('total', 'desc').limit(8),
        recent()
          .select(db.raw('count(*) as requests'))
          .select(db.raw('count(*) filter (where status_code >= 400) as errors'))
          .select(db.raw('count(distinct client_ip) as ips'))
          .select(db.raw('round(avg(duration_ms)) as avg_ms'))
          .first(),
      ])

    return {
      servers,
      statuses,
      topIps,
      events,
      incidents,
      timeline: timeline.rows,
      rules,
      topPaths,
      services,
      totals,
    }
  }

  /** Search recent events by IP prefix or path substring (sidebar search). */
  async search({ request }: HttpContext) {
    const q = String(request.input('q', '')).trim().slice(0, 200)
    if (!q) return []
    return db
      .from('events')
      .join('servers', 'servers.id', 'events.server_id')
      .select('events.*', 'servers.name as server')
      .where((w) => w.where('events.client_ip', 'like', `${q}%`).orWhere('events.path', 'ilike', `%${q}%`))
      .orderBy('events.ts', 'desc')
      .limit(200)
  }
}
