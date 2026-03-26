import { Injectable, Logger } from "@nestjs/common";
import {
	BaseRelayProvider,
	type RelaySubmissionResult,
} from "./base.provider.js";
import { maskUrl } from "../../common/url-safety.js";

@Injectable()
export class ApwgProvider extends BaseRelayProvider {
	readonly name = "apwg";
	private readonly logger = new Logger(ApwgProvider.name);

	async submitReport(url: string): Promise<RelaySubmissionResult> {
		this.logger.log(`[stub] Submitting ${maskUrl(url)} to APWG eCrime`);
		// TODO: implement APWG eCrime submission API
		return { success: true };
	}
}
