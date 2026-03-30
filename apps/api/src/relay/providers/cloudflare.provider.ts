import { Injectable, Logger } from "@nestjs/common";
import type { DomainIntel } from "../../domain-intel/domain-intel.service.js";
import { BaseRelayProvider, type RelaySubmissionResult } from "./base.provider.js";
import { maskUrl } from "../../common/url-safety.js";
import { env } from "../../config/env.js";

@Injectable()
export class CloudflareProvider extends BaseRelayProvider {
	readonly name = "cloudflare";
	private readonly logger = new Logger(CloudflareProvider.name);

	shouldRelay(intel: DomainIntel): boolean {
		return intel.isCloudflare;
	}

	async submitReport(url: string, _intel: DomainIntel): Promise<RelaySubmissionResult> {
		this.logger.log(`Submitting ${maskUrl(url)} to Cloudflare Abuse Reports`);

		const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID } = env();

		const response = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/abuse-reports/abuse_phishing`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					act: "abuse_phishing",
					email: "abuse@looksphishy.org",
					email2: "abuse@looksphishy.org",
					name: "LooksPhishy.org",
					justification:
						"This URL has been identified as a phishing site designed to deceive users into disclosing sensitive information. Reported and verified by LooksPhishy.org, an open-source phishing report relay service.",
					urls: url,
					host_notification: "send",
					owner_notification: "send",
				}),
				signal: AbortSignal.timeout(30_000),
			},
		);

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Cloudflare Abuse API returned ${response.status}: ${body}`);
		}

		const result = await response.json();

		this.logger.log(`Cloudflare abuse report submitted for ${maskUrl(url)}`);

		return { success: true, response: result };
	}
}
