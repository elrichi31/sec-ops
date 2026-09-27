import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { runDetection } from '#services/detector'

// ponytail: in-process interval, fine for one instance; move to a queue/cron if we run replicas
if (app.getEnvironment() === 'web') {
  const timer = setInterval(() => {
    runDetection().catch((error) => logger.error({ err: error }, 'detection failed'))
  }, 60_000)
  app.terminating(() => clearInterval(timer))
}
