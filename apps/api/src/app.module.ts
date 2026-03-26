import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "./database/database.module.js";
import { ReportModule } from "./report/report.module.js";
import { VerificationModule } from "./verification/verification.module.js";
import { RelayModule } from "./relay/relay.module.js";
import { WebhookModule } from "./webhook/webhook.module.js";

@Module({
	imports: [
		BullModule.forRoot({
			connection: {
				url: process.env.REDIS_URL,
			},
		}),
		DatabaseModule,
		ReportModule,
		VerificationModule,
		RelayModule,
		WebhookModule,
	],
})
export class AppModule {}
