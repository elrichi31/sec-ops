import { createHash, randomBytes } from 'node:crypto'
import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class ServerCreate extends BaseCommand {
  static commandName = 'server:create'
  static description = 'Register a server and print its ingest key (shown once)'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Server name, e.g. production-01' })
  declare name: string

  async run() {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const key = `zsm_${randomBytes(24).toString('hex')}`
    await db.table('servers').insert({
      name: this.name,
      ingest_key_hash: createHash('sha256').update(key).digest('hex'),
    })
    this.logger.success(`Server "${this.name}" created`)
    this.logger.log(`ZENLOR_INGEST_KEY=${key}`)
  }
}
