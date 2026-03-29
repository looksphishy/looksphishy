import { Injectable, Logger } from "@nestjs/common";
import type { DomainIntel } from "../../domain-intel/domain-intel.service.js";
import { BaseRelayProvider, type RelaySubmissionResult } from "./base.provider.js";
import { maskUrl } from "../../common/url-safety.js";

@Injectable()
export class MicrosoftProvider extends BaseRelayProvider {
	readonly name = "microsoft";
	private readonly logger = new Logger(MicrosoftProvider.name);

	async submitReport(url: string, _intel: DomainIntel): Promise<RelaySubmissionResult> {
		this.logger.log(`Submitting ${maskUrl(url)} to Microsoft WDSI`);

		const response = await fetch(
			"https://www.microsoft.com/en-us/wdsi/support/report-unsafe-site-guest",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					url,
					threat: "Phishing",
					comments: "Phishing URL reported and verified by LooksPhishy.org — an open-source phishing report relay service.",
				}).toString(),
				signal: AbortSignal.timeout(30_000),
			},
		);

		if (!response.ok) {
			throw new Error(`Microsoft WDSI returned ${response.status}`);
		}

		this.logger.log(`Microsoft WDSI submission sent for ${maskUrl(url)}`);

		return { success: true, response: { status: response.status } };
	}
}
