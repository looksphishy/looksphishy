import { Injectable, Logger } from "@nestjs/common";
import type { DomainIntel } from "../../domain-intel/domain-intel.service.js";
import { BaseRelayProvider, type RelaySubmissionResult } from "./base.provider.js";
import { maskUrl } from "../../common/url-safety.js";

@Injectable()
export class PhishtankProvider extends BaseRelayProvider {
	readonly name = "phishtank";
	private readonly logger = new Logger(PhishtankProvider.name);

	async submitReport(url: string, _intel: DomainIntel): Promise<RelaySubmissionResult> {
		this.logger.log(`[stub] Submitting ${maskUrl(url)} to PhishTank`);
		// TODO: implement PhishTank submission API
		return { success: true };
	}
}
