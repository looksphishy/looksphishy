import { Injectable, Logger } from "@nestjs/common";
import type { DomainIntel } from "../../domain-intel/domain-intel.service.js";
import { BaseRelayProvider, type RelaySubmissionResult } from "./base.provider.js";
import { maskUrl } from "../../common/url-safety.js";

@Injectable()
export class CloudflareProvider extends BaseRelayProvider {
	readonly name = "cloudflare";
	private readonly logger = new Logger(CloudflareProvider.name);

	shouldRelay(intel: DomainIntel): boolean {
		return intel.isCloudflare;
	}

	async submitReport(url: string, _intel: DomainIntel): Promise<RelaySubmissionResult> {
		this.logger.log(`[stub] Submitting ${maskUrl(url)} to Cloudflare Radar`);
		// TODO: implement Cloudflare Radar submission API
		return { success: true };
	}
}
