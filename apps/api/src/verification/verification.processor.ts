import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Inject } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { eq } from "drizzle-orm";
import type { Job } from "bullmq";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE } from "../database/database.module.js";
import * as schema from "../database/schema.js";
import { VerificationService } from "./verification.service.js";
import { RelayService } from "../relay/relay.service.js";

@Processor("verification")
export class VerificationProcessor extends WorkerHost {
	private readonly logger = new Logger(VerificationProcessor.name);

	constructor(
		@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
		private events: EventEmitter2,
		private verificationService: VerificationService,
		private relayService: RelayService,
	) {
		super();
	}

	async process(job: Job<{ reportId: string }>) {
		const { reportId } = job.data;
		this.logger.log(`Processing verification for report ${reportId}`);

		try {
			const result = await this.verificationService.verifyUrl(reportId);

			if (result.isPhishing) {
				await this.relayService.enqueueRelays(reportId);
			}
		} catch (err) {
			this.logger.error(`Verification failed for report ${reportId}`, err);

			// Reset status so the report isn't stuck in "verifying" forever
			await this.db
				.update(schema.reports)
				.set({ status: "pending", updatedAt: new Date() })
				.where(eq(schema.reports.id, reportId));
			this.events.emit("report.updated", reportId);

			throw err;
		}
	}
}
