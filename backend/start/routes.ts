/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import env from '#start/env'
import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

// OTLP/HTTP logs endpoint; the collector's otlp_http exporter appends /v1/logs
router.post('/v1/logs', [controllers.Ingest, 'logs'])

router
  .group(() => {
    router.get('/api/dashboard', [controllers.Dashboard, 'summary'])
    router.get('/api/search', [controllers.Dashboard, 'search'])
  })
  .use(async ({ request, response }, next) => {
    if (request.header('authorization') !== `Bearer ${env.get('DASHBOARD_TOKEN').release()}`) {
      return response.unauthorized({ error: 'unauthorized' })
    }
    return next()
  })

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
