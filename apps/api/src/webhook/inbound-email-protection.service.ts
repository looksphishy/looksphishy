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

	async screen(payload: CloudflareEmailPayload): Promise<InboundEmailScreeningResult> {
		const sender = this.normalizeEmail(payload.from);

		if (this.isAutoSubmitted(payload)) {
			this.logger.warn(`Dropping automated inbound email from ${sender}`);
			return { allowed: false, reason: "auto_submitted" };
		}

		if (this.hasBulkPrecedence(payload)) {
			this.logger.warn(`Dropping bulk/list inbound email from ${sender}`);
			return { allowed: false, reason: "bulk_precedence" };
		}

		const messageFingerprint = this.createMessageFingerprint(payload);

		try {
			const dedupeKey = this.messageKey(messageFingerprint);
			const globalKey = this.globalKey();
			const senderKey = this.senderKey(sender);
			const dedupeResult = await this.redis.set(
				dedupeKey,
				"1",
				"PX",
				env().INBOUND_EMAIL_MESSAGE_DEDUP_TTL_MS,
				"NX",
			);

			if (dedupeResult !== "OK") {
				this.logger.warn(`Dropping duplicate inbound email from ${sender}`);
				return { allowed: false, reason: "duplicate_message" };
			}

			const globalCount = await this.redis.incr(globalKey);
			if (globalCount === 1) {
				await this.redis.pexpire(globalKey, env().INBOUND_EMAIL_RATE_LIMIT_WINDOW_MS);
			}

			if (globalCount > env().INBOUND_EMAIL_GLOBAL_RATE_LIMIT_MAX_EMAILS) {
				this.logger.warn(
					`Global inbound email rate limit reached (${globalCount}/${env().INBOUND_EMAIL_GLOBAL_RATE_LIMIT_MAX_EMAILS})`,
				);
				return { allowed: false, reason: "global_rate_limited" };
			}

			const senderCount = await this.redis.incr(senderKey);
			if (senderCount === 1) {
				await this.redis.pexpire(senderKey, env().INBOUND_EMAIL_RATE_LIMIT_WINDOW_MS);
			}

			if (senderCount > env().INBOUND_EMAIL_RATE_LIMIT_MAX_EMAILS) {
				this.logger.warn(
					`Rate limiting inbound email from ${sender} (${senderCount}/${env().INBOUND_EMAIL_RATE_LIMIT_MAX_EMAILS})`,
				);
				return { allowed: false, reason: "sender_rate_limited" };
			}
		} catch (error) {
			this.logger.error(
				`Inbound email screening failed for ${sender}, continuing without Redis protections`,
				error instanceof Error ? error.stack : undefined,
			);
		}

		return { allowed: true };
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
			return this.hash(`message-id:${messageId.toLowerCase()}`);
		}

		const date = this.getHeader(payload.headers, "date")?.trim().toLowerCase() ?? "";
		const subject = payload.subject.trim().toLowerCase();
		const bodySample = (payload.text ?? payload.html ?? "").slice(0, 8_192);
		return this.hash(
			[
				"fallback",
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
