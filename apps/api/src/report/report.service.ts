import { Injectable, Inject, Logger } from "@nestjs/common"
import { InjectQueue } from "@nestjs/bullmq"
import { Queue } from "bullmq"
import { eq, and, gt } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type { ReportInput } from "@looksphishy/shared"
import { DRIZZLE } from "../database/database.module.js"
import * as schema from "../database/schema.js"
import { hashUrl, maskUrl } from "../common/url-safety.js"
import { encryptUrl } from "../common/crypto.js"

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name)

  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    @InjectQueue("verification") private verificationQueue: Queue,
  ) {}

  async submitReport(input: ReportInput) {
    const urlHash = hashUrl(input.url)
    this.logger.log(`Report received for ${maskUrl(input.url)}`)

    const recent = await this.isRecentlyReported(urlHash)
    if (recent) {
      this.logger.log(`Duplicate report for ${maskUrl(input.url)}, returning existing`)
      return {
        id: recent.id,
        status: recent.status,
        createdAt: recent.createdAt.toISOString(),
      }
    }

    const urlEncrypted = encryptUrl(input.url, process.env.URL_ENCRYPTION_KEY!)

    const [report] = await this.db
      .insert(schema.reports)
      .values({
        urlHash,
        urlEncrypted,
        reporterEmail: input.email ?? null,
        source: "web",
        turnstileVerified: true,
      })
      .returning()

    await this.verificationQueue.add("verify", { reportId: report.id })

    this.logger.log(`Report ${report.id} created, queued for verification`)

    return {
      id: report.id,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    }
  }

  async getReportStatus(id: string) {
    const report = await this.db.query.reports.findFirst({
      where: eq(schema.reports.id, id),
    })

    if (!report) {
      throw new Error("Report not found")
    }

    const relays = await this.db.query.relayResults.findMany({
      where: eq(schema.relayResults.reportId, id),
    })

    return {
      id: report.id,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      relayResults: relays.map((r) => ({
        provider: r.provider,
        status: r.status,
        attemptedAt: r.attemptedAt?.toISOString() ?? null,
      })),
    }
  }

  private async isRecentlyReported(urlHash: string) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    return this.db.query.reports.findFirst({
      where: and(
        eq(schema.reports.urlHash, urlHash),
        gt(schema.reports.createdAt, oneDayAgo),
      ),
    })
  }
}
