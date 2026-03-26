import { z } from "zod"

export const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  CORS_ORIGIN: z.string().default("http://localhost:4321"),
  TURNSTILE_SECRET_KEY: z.string(),
  URLSCAN_API_KEY: z.string().default(""),
  URL_ENCRYPTION_KEY: z.string().min(32),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(): Env {
  return envSchema.parse(process.env)
}
