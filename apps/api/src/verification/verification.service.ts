import { Injectable, Inject, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE } from "../database/database.module.js";
import * as schema from "../database/schema.js";
import { maskUrl } from "../common/url-safety.js";
import { env } from "../config/env.js";

interface VerificationResponse {
	verdict: "phishing" | "suspicious" | "legitimate";
	confidence: number;
	reasoning: string;
	signals: Record<string, unknown>;
}

@Injectable()
export class VerificationService {
	private readonly logger = new Logger(VerificationService.name);

	constructor(
		@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
		private events: EventEmitter2,
	) {}

	async verifyUrl(reportId: string): Promise<{ isPhishing: boolean }> {
		const report = await this.db.query.reports.findFirst({
			where: eq(schema.reports.id, reportId),
		});

		if (!report) {
			throw new Error(`Report ${reportId} not found`);
		}

		await this.db
			.update(schema.reports)
			.set({ status: "verifying", updatedAt: new Date() })
			.where(eq(schema.reports.id, reportId));
		this.events.emit("report.updated", reportId);

		this.logger.log(`Verifying ${maskUrl(report.url)} for report ${reportId}`);

		const result = await this.callVerificationService(report.url);

		this.logger.log(
			`Verification result for ${maskUrl(report.url)}: ${result.verdict} (confidence: ${result.confidence})`,
		);

		const isPhishing = result.verdict === "phishing";

		const newStatus = isPhishing ? "verified" : "rejected";
		await this.db
			.update(schema.reports)
			.set({ status: newStatus, updatedAt: new Date() })
			.where(eq(schema.reports.id, reportId));
		this.events.emit("report.updated", reportId);

		this.logger.log(`Report ${reportId} marked as ${newStatus}`);
		return { isPhishing };
	}

	private async callVerificationService(url: string): Promise<VerificationResponse> {
		const { VERIFICATION_API_URL, VERIFICATION_API_KEY } = env();

		const response = await fetch(`${VERIFICATION_API_URL}/verify`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": VERIFICATION_API_KEY,
			},
			body: JSON.stringify({ url }),
			signal: AbortSignal.timeout(60_000),
		});

		if (!response.ok) {
			const body = await response.text();
			this.logger.debug(`Verification service error: ${body}`);
			throw new Error(`Verification service returned ${response.status}`);
		}

		return (await response.json()) as VerificationResponse;
	}
}
