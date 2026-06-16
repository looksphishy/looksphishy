import type { RelayProvider } from "@looksphishy/shared";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE } from "../database/database.module.js";
import * as schema from "../database/schema.js";
import type { DomainIntelService } from "../domain-intel/domain-intel.service.js";
import type { BaseRelayProvider } from "./providers/base.provider.js";
import type { CloudflareProvider } from "./providers/cloudflare.provider.js";
import type { GoogleProvider } from "./providers/google.provider.js";
import type { HostingProvider } from "./providers/hosting.provider.js";
import type { NetcraftProvider } from "./providers/netcraft.provider.js";
import type { RegistrarProvider } from "./providers/registrar.provider.js";
import type { RelayService } from "./relay.service.js";

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

			// Report the resolved destination, not the forwarder (e.g. a
			// share.google link would otherwise send abuse reports to Google).
			const targetUrl = report.finalUrl ?? report.url;
			const intel = await this.domainIntel.lookup(targetUrl);

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
				const result = await provider.submitReport(targetUrl, intel);

				const status = result.quotaExceeded
					? ("quota_exceeded" as const)
					: result.success
						? "submitted"
						: "failed";

				await this.db
					.update(schema.relayResults)
					.set({
						status,
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
			} catch (err) {
				this.logger.error(
					`Relay to ${providerName} failed for report ${reportId}`,
					err instanceof Error ? err.stack : err,
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
