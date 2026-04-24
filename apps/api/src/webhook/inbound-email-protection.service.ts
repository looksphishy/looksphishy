import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";
import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import type { CloudflareEmailPayload } from "./email-parser.service.js";

type InboundEmailDropReason =
	| "auto_submitted"
	| "bulk_precedence"
	| "duplicate_message"
	| "global_rate_limited"
	| "sender_rate_limited";

interface InboundEmailScreeningResult {
	allowed: boolean;
	reason?: InboundEmailDropReason;
}

@Injectable()
export class InboundEmailProtectionService implements OnModuleDestroy {
	private readonly logger = new Logger(InboundEmailProtectionService.name);
	private readonly redis = new Redis(env().REDIS_URL, {
		lazyConnect: true,
		maxRetriesPerRequest: 1,
	});
	private readonly screenEmailScript = `
		local dedupeKey = KEYS[1]
		local globalKey = KEYS[2]
		local senderKey = KEYS[3]
		local dedupeTtlMs = tonumber(ARGV[1])
		local rateWindowMs = tonumber(ARGV[2])
		local globalLimit = tonumber(ARGV[3])
		local senderLimit = tonumber(ARGV[4])

		if redis.call("EXISTS", dedupeKey) == 1 then
			return "duplicate_message"
		end

		local globalCount = tonumber(redis.call("GET", globalKey) or "0")
		if globalCount >= globalLimit then
			return "global_rate_limited"
		end

		local senderCount = tonumber(redis.call("GET", senderKey) or "0")
		if senderCount >= senderLimit then
			return "sender_rate_limited"
		end

		globalCount = redis.call("INCR", globalKey)
		if globalCount == 1 then
			redis.call("PEXPIRE", globalKey, rateWindowMs)
		end

		senderCount = redis.call("INCR", senderKey)
		if senderCount == 1 then
			redis.call("PEXPIRE", senderKey, rateWindowMs)
		end

		redis.call("SET", dedupeKey, "1", "PX", dedupeTtlMs)
		return "allowed"
	`;

	async screen(payload: CloudflareEmailPayload): Promise<InboundEmailScreeningResult> {
		const reporterEmail = this.normalizeEmail(payload.reporterEmail ?? payload.from);

		if (this.isAutoSubmitted(payload)) {
			this.logger.warn(`Dropping automated inbound email from ${reporterEmail}`);
			return { allowed: false, reason: "auto_submitted" };
		}

		if (this.hasBulkPrecedence(payload)) {
			this.logger.warn(`Dropping bulk/list inbound email from ${reporterEmail}`);
			return { allowed: false, reason: "bulk_precedence" };
		}

		try {
			const result = String(
				await this.redis.eval(
					this.screenEmailScript,
					3,
					this.messageKey(this.createMessageFingerprint(payload)),
					this.globalKey(),
					this.senderKey(reporterEmail),
					env().INBOUND_EMAIL_MESSAGE_DEDUP_TTL_MS,
					env().INBOUND_EMAIL_RATE_LIMIT_WINDOW_MS,
					env().INBOUND_EMAIL_GLOBAL_RATE_LIMIT_MAX_EMAILS,
					env().INBOUND_EMAIL_RATE_LIMIT_MAX_EMAILS,
				),
			);

			if (result === "allowed") {
				return { allowed: true };
			}

			if (this.isDropReason(result)) {
				this.logDropReason(result, reporterEmail);
				return { allowed: false, reason: result };
			}

			this.logger.error(
				`Unexpected inbound email screening result for ${reporterEmail}: ${result}`,
			);
			return { allowed: false, reason: "global_rate_limited" };
		} catch (error) {
			this.logger.error(
				`Inbound email screening failed for ${reporterEmail}, falling back to HTTP throttling`,
				error instanceof Error ? error.stack : undefined,
			);
			return { allowed: true };
		}
	}

	onModuleDestroy() {
		void this.redis.quit();
	}

	private isAutoSubmitted(payload: CloudflareEmailPayload): boolean {
		const autoSubmitted = this.getHeader(payload.headers, "auto-submitted")?.toLowerCase();
		return autoSubmitted !== undefined && autoSubmitted !== "no";
	}

	private hasBulkPrecedence(payload: CloudflareEmailPayload): boolean {
		const precedence = this.getHeader(payload.headers, "precedence")?.toLowerCase();
		return precedence === "bulk" || precedence === "junk" || precedence === "list";
	}

	private createMessageFingerprint(payload: CloudflareEmailPayload): string {
		const messageId = this.getHeader(payload.headers, "message-id")?.trim();
		if (messageId) {
			return this.hash(
				[
					"message-id",
					this.normalizeEmail(payload.reporterEmail ?? payload.from),
					messageId.toLowerCase(),
				].join("\n"),
			);
		}

		const date = this.getHeader(payload.headers, "date")?.trim().toLowerCase() ?? "";
		const subject = payload.subject.trim().toLowerCase();
		const bodySample = (payload.text ?? payload.html ?? "").slice(0, 8_192);
		return this.hash(
			[
				"fallback",
				this.normalizeEmail(payload.reporterEmail ?? payload.from),
				this.normalizeEmail(payload.from),
				payload.to.trim().toLowerCase(),
				date,
				subject,
				bodySample,
			].join("\n"),
		);
	}

	private normalizeEmail(value: string): string {
		return value.trim().toLowerCase();
	}

	private isDropReason(value: string): value is InboundEmailDropReason {
		return (
			value === "duplicate_message" ||
			value === "global_rate_limited" ||
			value === "sender_rate_limited" ||
			value === "auto_submitted" ||
			value === "bulk_precedence"
		);
	}

	private logDropReason(reason: InboundEmailDropReason, reporterEmail: string) {
		switch (reason) {
			case "duplicate_message":
				this.logger.warn(`Dropping duplicate inbound email from ${reporterEmail}`);
				return;
			case "global_rate_limited":
				this.logger.warn(
					`Global inbound email rate limit reached while processing ${reporterEmail}`,
				);
				return;
			case "sender_rate_limited":
				this.logger.warn(`Rate limiting inbound email from ${reporterEmail}`);
				return;
			default:
				return;
		}
	}

	private getHeader(headers: Record<string, string>, name: string): string | undefined {
		const target = name.toLowerCase();
		for (const [key, value] of Object.entries(headers)) {
			if (key.toLowerCase() === target) {
				return value;
			}
		}
		return undefined;
	}

	private messageKey(fingerprint: string): string {
		return `inbound-email:message:${fingerprint}`;
	}

	private senderKey(sender: string): string {
		return `inbound-email:sender:${this.hash(sender)}`;
	}

	private globalKey(): string {
		return "inbound-email:global";
	}

	private hash(value: string): string {
		return createHash("sha256").update(value).digest("hex");
	}
}
