import { z } from "zod"
import { RELAY_PROVIDERS, RELAY_STATUSES } from "../constants.js"

export const relayProviderSchema = z.enum(RELAY_PROVIDERS)

export const relayResultSchema = z.object({
  provider: relayProviderSchema,
  status: z.enum(RELAY_STATUSES),
  attemptedAt: z.string().datetime().nullable(),
})

export type RelayResult = z.infer<typeof relayResultSchema>
