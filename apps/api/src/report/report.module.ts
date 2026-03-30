import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ReportService } from "./report.service.js";
import { ReportController } from "./report.controller.js";

@Module({
	imports: [
		BullModule.registerQueue({
			name: "verification",
			defaultJobOptions: {
				attempts: 3,
				backoff: { type: "exponential", delay: 5000 },
			},
		}),
	],
	controllers: [ReportController],
	providers: [ReportService],
	exports: [ReportService],
})
export class ReportModule {}
