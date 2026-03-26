import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import type { VerificationService } from "./verification.service.js";
import type { RelayService } from "../relay/relay.service.js";

@Processor("verification")
export class VerificationProcessor extends WorkerHost {
	private readonly logger = new Logger(VerificationProcessor.name);

	constructor(
		private verificationService: VerificationService,
		private relayService: RelayService,
	) {
		super();
	}

	async process(job: Job<{ reportId: string }>) {
		this.logger.log(`Processing verification for report ${job.data.reportId}`);

		const result = await this.verificationService.verifyUrl(job.data.reportId);

		if (result.isPhishing) {
			await this.relayService.enqueueRelays(job.data.reportId);
		}
	}
}
