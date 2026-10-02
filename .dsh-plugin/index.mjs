import z from '@deepseek-ai/schemastery'
import { registerGalRemote } from './gal-remote-service.mjs'

/** Host identity gives this independently installable bundle its own lifecycle. */
export const name = 'dsh-galgame'
export const inject = ['llm', 'typert']

// Gameplay preferences and saves stay in the existing client storage keys.
// A nonempty volatile schema is required for the official desktop config-form
// service to publish this namespace. The UI uses it to follow Host lifecycle.
export const Config = z.object({
  maxReplyCharacters: z.number().step(1).min(500).max(8_000).default(8_000).volatile(),
})

export function apply(ctx, config = {}) {
  registerGalRemote(ctx, config)
}
