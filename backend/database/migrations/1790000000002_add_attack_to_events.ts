import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('events', (table) => {
      table.text('user_agent').nullable()
      // set at ingest by attack_classifier: an exploit name, 'probe' or 'scanner'
      table.string('attack', 32).nullable()
    })
  }

  async down() {
    this.schema.alterTable('events', (table) => {
      table.dropColumn('user_agent')
      table.dropColumn('attack')
    })
  }
}
