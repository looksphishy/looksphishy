import { Injectable, Logger } from "@nestjs/common";
import type { DomainIntel } from "../../domain-intel/domain-intel.service.js";
import { BaseRelayProvider, type RelaySubmissionResult } from "./base.provider.js";
import { maskUrl } from "../../common/url-safety.js";

@Injectable()
export class RegistrarProvider extends BaseRelayProvider {
	readonly name = "registrar";
	private readonly logger = new Logger(RegistrarProvider.name);

	shouldRelay(intel: DomainIntel): boolean {
		return intel.registrarAbuseEmail !== null;
	}

	async submitReport(url: string, intel: DomainIntel): Promise<RelaySubmissionResult> {
		if (!intel.registrarAbuseEmail) {
			return { success: false, response: "No abuse email found" };
		}

		this.logger.log(
			`[stub] Sending abuse report for ${maskUrl(url)} to ${intel.registrar} (${intel.registrarAbuseEmail})`,
		);

		// TODO: send abuse email via AWS SES
		// Template should include:
		// - The phishing URL
		// - Evidence (verification result)
		// - Request to suspend/take down the domain
		// - Contact info for looksphishy.org

		return {
			success: true,
			response: {
				registrar: intel.registrar,
				abuseEmail: intel.registrarAbuseEmail,
			},
		};
	}
}
