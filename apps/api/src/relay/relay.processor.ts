import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger, Inject } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Job } from "bullmq";
import { eq, and } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { RelayProvider } from "@looksphishy/shared";
import { DRIZZLE } from "../database/database.module.js";
import * as schema from "../database/schema.js";
import { DomainIntelService } from "../domain-intel/domain-intel.service.js";
import { RelayService } from "./relay.service.js";
import { GoogleProvider } from "./providers/google.provider.js";
import { NetcraftProvider } from "./providers/netcraft.provider.js";
import { CloudflareProvider } from "./providers/cloudflare.provider.js";
import { RegistrarProvider } from "./providers/registrar.provider.js";
import { HostingProvider } from "./providers/hosting.provider.js";
import type { BaseRelayProvider } from "./providers/base.provider.js";

@Injectable()
@Processor("relay")
export class RelayProcessor extends WorkerHost {
	private readonly logger = new Logger(RelayProcessor.name);
	private readonly providers: Map<string, BaseRelayProvider>;

	constructor(
		@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
		private events: EventEmitter2,
		private relayService: RelayService,
		private domainIntel: DomainIntelService,
		private google: GoogleProvider,
		private netcraft: NetcraftProvider,
		private cloudflare: CloudflareProvider,
		private registrar: RegistrarProvider,
		private hosting: HostingProvider,
	) {
		super();
		this.providers = new Map<string, BaseRelayProvider>([
			["google", this.google],
			["netcraft", this.netcraft],
			["cloudflare", this.cloudflare],
			["registrar", this.registrar],
			["hosting", this.hosting],
		]);
	}

	async process(job: Job<{ reportId: string; provider: RelayProvider }>) {
		const { reportId, provider: providerName } = job.data;
		this.logger.log(`Relaying report ${reportId} to ${providerName}`);

		try {
			const provider = this.providers.get(providerName);
			if (!provider) {
				this.logger.error(`Unknown provider: ${providerName}`);
				return;
			}

			const report = await this.db.query.reports.findFirst({
				where: eq(schema.reports.id, reportId),
			});

			if (!report) {
				this.logger.error(`Report ${reportId} not found`);
				return;
			}

			const intel = await this.domainIntel.lookup(report.url);

			if (!provider.shouldRelay(intel)) {
				this.logger.log(
					`Skipping ${providerName} for report ${reportId} (not applicable)`,
				);

				await this.db
					.update(schema.relayResults)
					.set({ status: "skipped", attemptedAt: new Date() })
					.where(
						and(
							eq(schema.relayResults.reportId, reportId),
							eq(schema.relayResults.provider, providerName),
						),
					);
				this.events.emit("report.updated", reportId);
				return;
			}

			try {
				const result = await provider.submitReport(report.url, intel);

				await this.db
					.update(schema.relayResults)
					.set({
						status: result.success ? "submitted" : "failed",
						responseData: result.response ?? null,
						attemptedAt: new Date(),
					})
					.where(
						and(
							eq(schema.relayResults.reportId, reportId),
							eq(schema.relayResults.provider, providerName),
						),
					);
				this.events.emit("report.updated", reportId);
			} catch {
				this.logger.error(
					`Relay to ${providerName} failed for report ${reportId}`,
				);

				await this.db
					.update(schema.relayResults)
					.set({ status: "failed", attemptedAt: new Date() })
					.where(
						and(
							eq(schema.relayResults.reportId, reportId),
							eq(schema.relayResults.provider, providerName),
						),
					);
				this.events.emit("report.updated", reportId);
			}
		} catch (err) {
			this.logger.error(
				`Unhandled error in relay for ${providerName} / ${reportId}`,
				err,
			);

			await this.db
				.update(schema.relayResults)
				.set({ status: "failed", attemptedAt: new Date() })
				.where(
					and(
						eq(schema.relayResults.reportId, reportId),
						eq(schema.relayResults.provider, providerName),
					),
				);
			this.events.emit("report.updated", reportId);
		} finally {
			await this.relayService.markRelayComplete(reportId);
		}
	}
}
