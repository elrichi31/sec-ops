/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  ingest: {
    logs: typeof routes['ingest.logs']
  }
  dashboard: {
    summary: typeof routes['dashboard.summary']
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
