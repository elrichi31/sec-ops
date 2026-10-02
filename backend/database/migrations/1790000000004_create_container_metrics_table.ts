import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Latest docker_stats reading per container (upserted every scrape, no history).
    this.schema.createTable('container_metrics', (table) => {
      table.integer('server_id').notNullable().references('servers.id').onDelete('CASCADE')
      table.string('name').notNullable()
      table.string('image').nullable()
      table.timestamp('ts').notNullable()
      table.float('cpu_pct').nullable()
      table.bigInteger('mem_used').nullable()
      table.bigInteger('mem_limit').nullable()
      table.primary(['server_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable('container_metrics')
  }
}
