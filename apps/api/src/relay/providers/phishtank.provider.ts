import { Injectable, Logger } from "@nestjs/common";
import {
	BaseRelayProvider,
	type RelaySubmissionResult,
} from "./base.provider.js";
import { maskUrl } from "../../common/url-safety.js";

@Injectable()
export class PhishtankProvider extends BaseRelayProvider {
	readonly name = "phishtank";
	private readonly logger = new Logger(PhishtankProvider.name);

	async submitReport(url: string): Promise<RelaySubmissionResult> {
		this.logger.log(`[stub] Submitting ${maskUrl(url)} to PhishTank`);
		// TODO: implement PhishTank submission API
		return { success: true };
	}
}
