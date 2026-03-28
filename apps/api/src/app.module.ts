import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "./database/database.module.js";
import { DomainIntelModule } from "./domain-intel/domain-intel.module.js";
import { ReportModule } from "./report/report.module.js";
import { VerificationModule } from "./verification/verification.module.js";
import { RelayModule } from "./relay/relay.module.js";
import { WebhookModule } from "./webhook/webhook.module.js";
import { HealthModule } from "./health/health.module.js";

@Module({
	imports: [
		BullModule.forRootAsync({
			useFactory: () => ({
				connection: {
					url: process.env.REDIS_URL,
				},
			}),
		}),
		DatabaseModule,
		DomainIntelModule,
		ReportModule,
		VerificationModule,
		RelayModule,
		WebhookModule,
		HealthModule,
	],
})
export class AppModule {}
