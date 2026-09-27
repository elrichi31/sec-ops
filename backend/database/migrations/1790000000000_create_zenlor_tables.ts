import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('servers', (table) => {
      table.increments('id')
      table.string('name').notNullable().unique()
      table.string('ingest_key_hash', 64).notNullable().unique()
      table.timestamp('last_seen_at').nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
    })

    this.schema.createTable('events', (table) => {
      table.bigIncrements('id')
      table.timestamp('ts').notNullable()
      table.integer('server_id').notNullable().references('servers.id').onDelete('CASCADE')
      table.string('source').notNullable()
      table.string('service').nullable()
      table.string('client_ip').nullable()
      table.string('method', 16).nullable()
      table.text('path').nullable()
      table.smallint('status_code').nullable()
      table.integer('duration_ms').nullable()
      table.index(['client_ip', 'ts'])
      table.index(['ts'])
    })

    this.schema.createTable('incidents', (table) => {
      table.bigIncrements('id')
      table.string('rule').notNullable()
      table.string('client_ip').notNullable()
      table.integer('server_id').notNullable().references('servers.id').onDelete('CASCADE')
      table.integer('hits').notNullable()
      table.text('sample_path').nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.index(['rule', 'client_ip', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable('incidents')
    this.schema.dropTable('events')
    this.schema.dropTable('servers')
  }
}
