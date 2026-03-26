import { Processor, WorkerHost } from "@nestjs/bullmq"
import { Injectable, Logger, Inject } from "@nestjs/common"
import type { Job } from "bullmq"
import { eq, and } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type { RelayProvider } from "@looksphishy/shared"
import { DRIZZLE } from "../database/database.module.js"
import * as schema from "../database/schema.js"
import { decryptUrl } from "../common/crypto.js"
import { RelayService } from "./relay.service.js"
import { GoogleProvider } from "./providers/google.provider.js"
import { CloudflareProvider } from "./providers/cloudflare.provider.js"
import { ApwgProvider } from "./providers/apwg.provider.js"
import { PhishtankProvider } from "./providers/phishtank.provider.js"
import type { BaseRelayProvider } from "./providers/base.provider.js"

@Injectable()
@Processor("relay")
export class RelayProcessor extends WorkerHost {
  private readonly logger = new Logger(RelayProcessor.name)
  private readonly providers: Map<string, BaseRelayProvider>

  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    private relayService: RelayService,
    private google: GoogleProvider,
    private cloudflare: CloudflareProvider,
    private apwg: ApwgProvider,
    private phishtank: PhishtankProvider,
  ) {
    super()
    this.providers = new Map<string, BaseRelayProvider>([
      ["google", this.google],
      ["cloudflare", this.cloudflare],
      ["apwg", this.apwg],
      ["phishtank", this.phishtank],
    ])
  }

  async process(job: Job<{ reportId: string; provider: RelayProvider }>) {
    const { reportId, provider: providerName } = job.data
    this.logger.log(`Relaying report ${reportId} to ${providerName}`)

    const provider = this.providers.get(providerName)
    if (!provider) {
      this.logger.error(`Unknown provider: ${providerName}`)
      return
    }

    const report = await this.db.query.reports.findFirst({
      where: eq(schema.reports.id, reportId),
    })

    if (!report) {
      this.logger.error(`Report ${reportId} not found`)
      return
    }

    const url = decryptUrl(report.urlEncrypted, process.env.URL_ENCRYPTION_KEY!)

    try {
      const result = await provider.submitReport(url)

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
        )
    } catch (error) {
      this.logger.error(`Relay to ${providerName} failed for report ${reportId}`)

      await this.db
        .update(schema.relayResults)
        .set({ status: "failed", attemptedAt: new Date() })
        .where(
          and(
            eq(schema.relayResults.reportId, reportId),
            eq(schema.relayResults.provider, providerName),
          ),
        )
    }

    await this.relayService.markRelayComplete(reportId)
  }
}
