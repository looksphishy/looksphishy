import { Injectable, Logger } from "@nestjs/common";
import type { DomainIntel } from "../../domain-intel/domain-intel.service.js";
import {
	BaseRelayProvider,
	type RelaySubmissionResult,
} from "./base.provider.js";
import { maskUrl } from "../../common/url-safety.js";

@Injectable()
export class NetcraftProvider extends BaseRelayProvider {
	readonly name = "netcraft";
	private readonly logger = new Logger(NetcraftProvider.name);

	async submitReport(
		url: string,
		_intel: DomainIntel,
	): Promise<RelaySubmissionResult> {
		this.logger.log(`Submitting ${maskUrl(url)} to Netcraft`);

		const response = await fetch(
			"https://report.netcraft.com/api/v3/report/urls",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "reports@looksphishy.org",
					reason:
						"Phishing URL reported and verified by LooksPhishy.org — an open-source phishing report relay service.",
					urls: [{ url }],
				}),
				signal: AbortSignal.timeout(30_000),
			},
		);

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Netcraft returned ${response.status}: ${body}`);
		}

		const result = await response.json();

		this.logger.log(`Netcraft report submitted for ${maskUrl(url)}`);

		return { success: true, response: result };
	}
}
