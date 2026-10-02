/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  ingest: {
    logs: typeof routes['ingest.logs']
    metrics: typeof routes['ingest.metrics']
  }
  dashboard: {
    summary: typeof routes['dashboard.summary']
    search: typeof routes['dashboard.search']
    monitoring: typeof routes['dashboard.monitoring']
  }
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
}
