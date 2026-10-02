import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // One row per collector scrape (hostmetrics receiver, every 30 s); kept 7 days.
    this.schema.createTable('host_metrics', (table) => {
      table.bigIncrements('id')
      table.integer('server_id').notNullable().references('servers.id').onDelete('CASCADE')
      table.timestamp('ts').notNullable()
      table.float('cpu_pct').nullable()
      table.smallint('cpus').nullable()
      table.float('load1').nullable()
      table.float('load5').nullable()
      table.float('load15').nullable()
      table.bigInteger('mem_used').nullable()
      table.bigInteger('mem_total').nullable()
      table.bigInteger('disk_used').nullable()
      table.bigInteger('disk_total').nullable()
      table.index(['server_id', 'ts'])
    })
  }

  async down() {
    this.schema.dropTable('host_metrics')
  }
}
