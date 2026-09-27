import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { EXPLOITS } from '#services/attack_classifier'

/**
 * Each rule is a WHERE clause + threshold over the last minute of events,
 * grouped by (server, ip). Same rule+ip won't re-fire for 10 minutes.
 * `attack` is tagged at ingest; every exploit type is its own rule so alerts say what it was.
 */
const RULES = [
  { name: 'scan_404', where: `status_code = 404`, min: 20 },
  { name: 'sensitive_path_probe', where: `attack = 'probe'`, min: 1 },
  { name: 'login_bruteforce', where: `status_code IN (401, 403) AND path ILIKE '%login%'`, min: 10 },
  { name: 'attack_tool', where: `attack = 'scanner'`, min: 1 },
  ...EXPLOITS.map((name) => ({ name, where: `attack = '${name}'`, min: 1 })),
]

async function notify(text: string) {
  const token = env.get('TELEGRAM_BOT_TOKEN')
  const chatId = env.get('TELEGRAM_CHAT_ID')
  if (!token || !chatId) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch((error) => logger.error({ err: error }, 'telegram notify failed'))
}

export async function runDetection() {
  for (const rule of RULES) {
    const { rows } = await db.rawQuery(
      `INSERT INTO incidents (rule, client_ip, server_id, hits, sample_path)
       SELECT ?, e.client_ip, e.server_id, count(*), min(e.path)
       FROM events e
       WHERE e.ts > now() - interval '1 minute' AND e.client_ip IS NOT NULL AND (${rule.where})
       GROUP BY e.client_ip, e.server_id
       HAVING count(*) >= ?
         AND NOT EXISTS (
           SELECT 1 FROM incidents i
           WHERE i.rule = ? AND i.client_ip = e.client_ip AND i.server_id = e.server_id
             AND i.created_at > now() - interval '10 minutes')
       RETURNING *, (SELECT name FROM servers WHERE id = server_id) AS server`,
      [rule.name, rule.min, rule.name]
    )
    for (const inc of rows) {
      await notify(
        `🚨 ${inc.rule}\nServer: ${inc.server}\nIP: ${inc.client_ip}\nHits (1m): ${inc.hits}\nPath: ${inc.sample_path}`
      )
    }
  }
}
