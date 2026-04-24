import { z } from "zod";

export const envSchema = z.object({
	PORT: z.coerce.number().default(3001),
	DATABASE_URL: z.string(),
	REDIS_URL: z.string(),
	CORS_ORIGIN: z.string().default("http://localhost:4321"),
	TURNSTILE_SECRET_KEY: z.string(),
	WEBHOOK_SECRET: z.string().min(16),
	INBOUND_EMAIL_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(900_000),
	INBOUND_EMAIL_RATE_LIMIT_MAX_EMAILS: z.coerce.number().int().min(1).default(5),
	INBOUND_EMAIL_GLOBAL_RATE_LIMIT_MAX_EMAILS: z.coerce.number().int().min(1).default(30),
	INBOUND_EMAIL_MESSAGE_DEDUP_TTL_MS: z.coerce.number().int().min(60_000).default(86_400_000),

	// Plunk (user-facing transactional email, self-hosted)
	PLUNK_API_KEY: z.string(),
	PLUNK_API_URL: z.string().url(),

	// AWS SES (abuse report emails via dedicated subdomain)
	AWS_REGION: z.string().default("eu-central-1"),
	AWS_ACCESS_KEY_ID: z.string(),
	AWS_SECRET_ACCESS_KEY: z.string(),
	SES_FROM_ADDRESS: z.string().email(),

	// Google Web Risk
	GOOGLE_CLOUD_PROJECT_ID: z.string(),
	GOOGLE_WEB_RISK_API_KEY: z.string(),

	// Cloudflare Abuse Reports
	CLOUDFLARE_API_TOKEN: z.string(),
	CLOUDFLARE_ACCOUNT_ID: z.string(),

	// Verification service
	VERIFICATION_API_URL: z.string().url(),
	VERIFICATION_API_KEY: z.string().min(16),
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
