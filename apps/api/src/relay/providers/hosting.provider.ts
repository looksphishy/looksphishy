import { Injectable, Logger } from "@nestjs/common";
import type { DomainIntel } from "../../domain-intel/domain-intel.service.js";
import { BaseRelayProvider, type RelaySubmissionResult } from "./base.provider.js";
import { AbuseMailService } from "../../abuse-mail/abuse-mail.service.js";
import { maskUrl } from "../../common/url-safety.js";
import { buildAbuseEmail } from "./abuse-email.js";

@Injectable()
export class HostingProvider extends BaseRelayProvider {
	readonly name = "hosting";
	private readonly logger = new Logger(HostingProvider.name);

	constructor(private readonly abuseMail: AbuseMailService) {
		super();
	}

	shouldRelay(intel: DomainIntel): boolean {
		return intel.hostingAbuseEmail !== null;
	}

	async submitReport(url: string, intel: DomainIntel): Promise<RelaySubmissionResult> {
		if (!intel.hostingAbuseEmail) {
			return { success: false, response: "No hosting abuse email found" };
		}

		this.logger.log(
			`Sending abuse report for ${maskUrl(url)} to hosting provider ${intel.hostingProvider} (${intel.hostingAbuseEmail})`,
		);

		const { subject, text, html } = buildAbuseEmail(url, intel, "hosting");

		const messageId = await this.abuseMail.send({
			to: intel.hostingAbuseEmail,
			subject,
			text,
			html,
		});

		return {
			success: true,
			response: {
				messageId,
				hostingProvider: intel.hostingProvider,
				abuseEmail: intel.hostingAbuseEmail,
			},
		};
	}
}
