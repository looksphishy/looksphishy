import {
	Controller,
	Post,
	Body,
	Headers,
	Logger,
	UnauthorizedException,
	BadRequestException,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { z } from "zod";
import { EmailParserService } from "./email-parser.service.js";
import { InboundEmailProtectionService } from "./inbound-email-protection.service.js";
import { ReportService } from "../report/report.service.js";
import { env } from "../config/env.js";
import { timingSafeEqual } from "node:crypto";

const emailPayloadSchema = z.object({
	from: z.string().email(),
	to: z.string(),
	subject: z.string(),
	text: z.string().optional(),
	html: z.string().optional(),
	headers: z.record(z.string()).default({}),
});

@Controller("api/webhooks")
export class WebhookController {
	private readonly logger = new Logger(WebhookController.name);

	constructor(
		private emailParser: EmailParserService,
		private inboundEmailProtection: InboundEmailProtectionService,
		private reportService: ReportService,
	) {}

	@Post("inbound-email")
	@SkipThrottle()
	async handleInboundEmail(
		@Body() body: unknown,
		@Headers("x-webhook-secret") secret?: string,
	) {
		if (!secret || !this.verifySecret(secret)) {
			throw new UnauthorizedException();
		}

		const parsed = emailPayloadSchema.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException("Invalid email payload");
		}

		this.logger.log("Inbound email received for processing");

		const screening = await this.inboundEmailProtection.screen(parsed.data);
		if (!screening.allowed) {
			return { processed: 0, dropped: screening.reason };
		}

		const urls = this.emailParser.extractUrls(parsed.data);

		if (urls.length === 0) {
			return { processed: 0 };
		}

		const maxUrlsPerEmail = 1;
		if (urls.length > maxUrlsPerEmail) {
			this.logger.warn(
				`Inbound email from ${parsed.data.from} contained ${urls.length} unique URLs, only the first ${maxUrlsPerEmail} will be processed`,
			);
		}

		for (const url of urls.slice(0, maxUrlsPerEmail)) {
			await this.reportService.submitReport(
				{ url, email: parsed.data.from, turnstileToken: "" },
				{ source: "email", skipTurnstile: true },
			);
		}

		return {
			processed: Math.min(urls.length, maxUrlsPerEmail),
			ignored: Math.max(0, urls.length - maxUrlsPerEmail),
		};
	}

	private verifySecret(provided: string): boolean {
		const expected = env().WEBHOOK_SECRET;
		if (provided.length !== expected.length) return false;

		return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
	}
}
