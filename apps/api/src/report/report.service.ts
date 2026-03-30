import { Injectable, Inject, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { TRPCError } from "@trpc/server";
import type { Queue } from "bullmq";
import { eq, and, gt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ReportInput, ReportSource } from "@looksphishy/shared";
import { DRIZZLE } from "../database/database.module.js";
import * as schema from "../database/schema.js";
import { hashUrl, maskUrl } from "../common/url-safety.js";
import { env } from "../config/env.js";

@Injectable()
export class ReportService {
	private readonly logger = new Logger(ReportService.name);

	constructor(
		@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
		@InjectQueue("verification") private verificationQueue: Queue,
		private events: EventEmitter2,
	) {}

	async submitReport(
		input: ReportInput,
		options?: { source?: ReportSource; skipTurnstile?: boolean },
	) {
		const source = options?.source ?? "web";

		if (!options?.skipTurnstile) {
			const turnstileValid = await this.verifyTurnstile(input.turnstileToken);
			if (!turnstileValid) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Turnstile verification failed",
				});
			}
		}

		const urlHash = hashUrl(input.url);
		this.logger.log(`Report received for ${maskUrl(input.url)}`);

		const recent = await this.isRecentlyReported(urlHash);
		if (recent) {
			this.logger.log(`Duplicate report, returning existing ${recent.id}`);
			return {
				id: recent.id,
				status: recent.status,
				createdAt: recent.createdAt.toISOString(),
			};
		}

		const [report] = await this.db
			.insert(schema.reports)
			.values({
				url: input.url,
				urlHash,
				reporterEmail: input.email ?? null,
				source,
				turnstileVerified: !options?.skipTurnstile,
			})
			.returning();

		try {
			await this.verificationQueue.add("verify", { reportId: report.id });
		} catch (err) {
			this.logger.error(`Failed to enqueue verification for report ${report.id}`, err);
			await this.db
				.delete(schema.reports)
				.where(eq(schema.reports.id, report.id));
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to process report, please try again",
			});
		}

		this.events.emit("report.submitted", report.id);

		this.logger.log(`Report ${report.id} created, queued for verification`);

		return {
			id: report.id,
			status: report.status,
			createdAt: report.createdAt.toISOString(),
		};
	}

	async getReportStatus(id: string) {
		const report = await this.db.query.reports.findFirst({
			where: eq(schema.reports.id, id),
		});

		if (!report) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Report not found",
			});
		}

		const relays = await this.db.query.relayResults.findMany({
			where: eq(schema.relayResults.reportId, id),
		});

		return {
			id: report.id,
			url: report.url,
			status: report.status,
			source: report.source,
			createdAt: report.createdAt.toISOString(),
			relayResults: relays.map((r) => ({
				provider: r.provider,
				status: r.status,
				attemptedAt: r.attemptedAt?.toISOString() ?? null,
			})),
		};
	}

	private async verifyTurnstile(token: string): Promise<boolean> {
		try {
			const response = await fetch(
				"https://challenges.cloudflare.com/turnstile/v0/siteverify",
				{
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: new URLSearchParams({
						secret: env().TURNSTILE_SECRET_KEY,
						response: token,
					}),
				},
			);

			const result = (await response.json()) as { success: boolean };
			return result.success;
		} catch {
			this.logger.error("Turnstile verification request failed");
			return false;
		}
	}

	private async isRecentlyReported(urlHash: string) {
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		return this.db.query.reports.findFirst({
			where: and(
				eq(schema.reports.urlHash, urlHash),
				gt(schema.reports.createdAt, oneDayAgo),
			),
		});
	}
}
