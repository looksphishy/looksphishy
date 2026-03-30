import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { BullModule } from "@nestjs/bullmq";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { DatabaseModule } from "./database/database.module.js";
import { DomainIntelModule } from "./domain-intel/domain-intel.module.js";
import { EmailModule } from "./email/email.module.js";
import { AbuseMailModule } from "./abuse-mail/abuse-mail.module.js";
import { ReportModule } from "./report/report.module.js";
import { VerificationModule } from "./verification/verification.module.js";
import { RelayModule } from "./relay/relay.module.js";
import { WebhookModule } from "./webhook/webhook.module.js";
import { HealthModule } from "./health/health.module.js";

@Module({
	imports: [
		ThrottlerModule.forRoot([
			{ name: "short", ttl: 60_000, limit: 20 },
			{ name: "long", ttl: 600_000, limit: 100 },
		]),
		EventEmitterModule.forRoot({ maxListeners: 100 }),
		BullModule.forRootAsync({
			useFactory: () => ({
				connection: {
					url: process.env.REDIS_URL,
				},
			}),
		}),
		DatabaseModule,
		DomainIntelModule,
		EmailModule,
		AbuseMailModule,
		ReportModule,
		VerificationModule,
		RelayModule,
		WebhookModule,
		HealthModule,
	],
	providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
