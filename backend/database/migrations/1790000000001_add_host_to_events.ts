import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('events', (table) => {
      table.string('host').nullable()
    })
    // Before this column, unrouted Traefik requests stored their Host in `service`.
    // Real Traefik services always carry a provider suffix (@docker, @file, ...).
    this.defer(async (db) => {
      await db.rawQuery(
        `UPDATE events SET host = service, service = NULL WHERE source = 'traefik' AND service IS NOT NULL AND service NOT LIKE '%@%'`
      )
    })
  }

  async down() {
    this.schema.alterTable('events', (table) => {
      table.dropColumn('host')
    })
  }
}
