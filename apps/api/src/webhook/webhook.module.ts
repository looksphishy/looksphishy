import { Module } from "@nestjs/common";
import { WebhookController } from "./webhook.controller.js";
import { EmailParserService } from "./email-parser.service.js";
import { ReportModule } from "../report/report.module.js";

@Module({
	imports: [ReportModule],
	controllers: [WebhookController],
	providers: [EmailParserService],
})
export class WebhookModule {}
