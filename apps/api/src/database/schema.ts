import {
	pgTable,
	uuid,
	text,
	boolean,
	timestamp,
	jsonb,
	index,
} from "drizzle-orm/pg-core";

export const reports = pgTable(
	"reports",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		urlHash: text("url_hash").notNull(),
		urlEncrypted: text("url_encrypted").notNull(),
		reporterEmail: text("reporter_email"),
		source: text("source", { enum: ["web", "email", "api"] }).notNull(),
		status: text("status", {
			enum: [
				"pending",
				"verifying",
				"verified",
				"rejected",
				"relaying",
				"completed",
			],
		})
			.notNull()
			.default("pending"),
		turnstileVerified: boolean("turnstile_verified").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("reports_url_hash_idx").on(table.urlHash)],
);

export const relayResults = pgTable(
	"relay_results",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		reportId: uuid("report_id")
			.notNull()
			.references(() => reports.id),
		provider: text("provider", {
			enum: ["google", "cloudflare", "apwg", "phishtank"],
		}).notNull(),
		status: text("status", {
			enum: ["pending", "submitted", "accepted", "failed"],
		})
			.notNull()
			.default("pending"),
		responseData: jsonb("response_data"),
		attemptedAt: timestamp("attempted_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("relay_results_report_id_idx").on(table.reportId)],
);
