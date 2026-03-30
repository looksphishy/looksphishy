import { Injectable, Logger } from "@nestjs/common";
import type { DomainIntel } from "../../domain-intel/domain-intel.service.js";
import { BaseRelayProvider, type RelaySubmissionResult } from "./base.provider.js";
import { maskUrl } from "../../common/url-safety.js";
import { env } from "../../config/env.js";

@Injectable()
export class GoogleProvider extends BaseRelayProvider {
	readonly name = "google";
	private readonly logger = new Logger(GoogleProvider.name);

	async submitReport(url: string, _intel: DomainIntel): Promise<RelaySubmissionResult> {
		this.logger.log(`Submitting ${maskUrl(url)} to Google Web Risk`);

		const { GOOGLE_CLOUD_PROJECT_ID, GOOGLE_WEB_RISK_API_KEY } = env();

		const response = await fetch(
			`https://webrisk.googleapis.com/v1/projects/${GOOGLE_CLOUD_PROJECT_ID}/uris:submit?key=${GOOGLE_WEB_RISK_API_KEY}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					submission: { uri: url },
					threatInfo: {
						abuseType: "SOCIAL_ENGINEERING",
						threatJustification: {
							labels: ["AUTOMATED_REPORT"],
							comments: "Phishing URL reported and verified by LooksPhishy.org",
						},
						threatConfidence: { level: "HIGH" },
					},
					threatDiscovery: {
						platform: "GENERAL_PLATFORM",
					},
				}),
				signal: AbortSignal.timeout(30_000),
			},
		);

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Google Web Risk returned ${response.status}: ${body}`);
		}

		const result = await response.json();

		this.logger.log(`Google Web Risk submission accepted for ${maskUrl(url)}`);

		return { success: true, response: result };
	}
}
