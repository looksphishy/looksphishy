import { z } from "zod";

export const envSchema = z.object({
	PORT: z.coerce.number().default(3001),
	DATABASE_URL: z.string(),
	REDIS_URL: z.string(),
	CORS_ORIGIN: z.string().default("http://localhost:4321"),
	TURNSTILE_SECRET_KEY: z.string(),
	URLSCAN_API_KEY: z.string().default(""),
	URL_ENCRYPTION_KEY: z.string().min(32),
	WEBHOOK_SECRET: z.string().min(16),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function validateEnv(): Env {
	_env = envSchema.parse(process.env);
	return _env;
}

export function env(): Env {
	if (!_env) throw new Error("env() called before validateEnv()");
	return _env;
}
