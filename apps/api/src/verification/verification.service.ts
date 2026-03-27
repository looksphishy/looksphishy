import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE } from "../database/database.module.js";
import * as schema from "../database/schema.js";
import { maskUrl } from "../common/url-safety.js";
import { AllowlistService } from "./allowlist.service.js";

@Injectable()
export class VerificationService {
	private readonly logger = new Logger(VerificationService.name);

	constructor(
		@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
		private allowlistService: AllowlistService,
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

		this.logger.log(`Verifying ${maskUrl(report.url)} for report ${reportId}`);

		if (this.allowlistService.isAllowlisted(report.url)) {
			this.logger.warn(
				`Report ${reportId} rejected: ${maskUrl(report.url)} is on the allowlist`,
			);
			await this.db
				.update(schema.reports)
				.set({ status: "rejected", updatedAt: new Date() })
				.where(eq(schema.reports.id, reportId));
			return { isPhishing: false };
		}

		// TODO: integrate urlscan.io API
		// For now, mark all non-allowlisted URLs as verified (stub)
		const isPhishing = true;

		const newStatus = isPhishing ? "verified" : "rejected";
		await this.db
			.update(schema.reports)
			.set({ status: newStatus, updatedAt: new Date() })
			.where(eq(schema.reports.id, reportId));

		this.logger.log(`Report ${reportId} marked as ${newStatus}`);
		return { isPhishing };
	}
}
