import { Injectable, Inject, Logger } from "@nestjs/common"
import { InjectQueue } from "@nestjs/bullmq"
import { Queue } from "bullmq"
import { eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { RELAY_PROVIDERS } from "@looksphishy/shared"
import { DRIZZLE } from "../database/database.module.js"
import * as schema from "../database/schema.js"

@Injectable()
export class RelayService {
  private readonly logger = new Logger(RelayService.name)

  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    @InjectQueue("relay") private relayQueue: Queue,
  ) {}

  async enqueueRelays(reportId: string) {
    await this.db
      .update(schema.reports)
      .set({ status: "relaying", updatedAt: new Date() })
      .where(eq(schema.reports.id, reportId))

    for (const provider of RELAY_PROVIDERS) {
      await this.db.insert(schema.relayResults).values({
        reportId,
        provider,
      })

      await this.relayQueue.add("relay", { reportId, provider })
    }

    this.logger.log(
      `Enqueued ${RELAY_PROVIDERS.length} relay jobs for report ${reportId}`,
    )
  }

  async markRelayComplete(reportId: string) {
    const results = await this.db.query.relayResults.findMany({
      where: eq(schema.relayResults.reportId, reportId),
    })

    const allDone = results.every(
      (r) => r.status === "submitted" || r.status === "accepted" || r.status === "failed",
    )

    if (allDone) {
      await this.db
        .update(schema.reports)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(schema.reports.id, reportId))

      this.logger.log(`Report ${reportId} completed all relays`)
    }
  }
}
