import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'

export default class DashboardController {
  async summary({}: HttpContext) {
    const since = new Date(Date.now() - 24 * 3600_000)

    const [servers, statuses, topIps, events, incidents] = await Promise.all([
      db.from('servers').select('id', 'name', 'last_seen_at').orderBy('name'),
      db
        .from('events')
        .where('ts', '>=', since)
        .select('status_code')
        .count('* as total')
        .groupBy('status_code')
        .orderBy('status_code'),
      db
        .from('events')
        .where('ts', '>=', since)
        .whereNotNull('client_ip')
        .select('client_ip')
        .count('* as total')
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
    ])

    return { servers, statuses, topIps, events, incidents }
  }
}
