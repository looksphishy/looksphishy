import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { json } from "express";
import { WebhookController } from "./webhook.controller.js";
import { EmailParserService } from "./email-parser.service.js";
import { ReportModule } from "../report/report.module.js";

@Module({
	imports: [ReportModule],
	controllers: [WebhookController],
	providers: [EmailParserService],
})
export class WebhookModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(json({ limit: "1mb" })).forRoutes(WebhookController);
	}
}
