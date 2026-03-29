import { Injectable, Logger } from "@nestjs/common";
import type { DomainIntel } from "../../domain-intel/domain-intel.service.js";
import { BaseRelayProvider, type RelaySubmissionResult } from "./base.provider.js";
import { AbuseMailService } from "../../abuse-mail/abuse-mail.service.js";
import { maskUrl } from "../../common/url-safety.js";
import { buildAbuseEmail } from "./registrar-email.js";

@Injectable()
export class RegistrarProvider extends BaseRelayProvider {
	readonly name = "registrar";
	private readonly logger = new Logger(RegistrarProvider.name);

	constructor(private readonly abuseMail: AbuseMailService) {
		super();
	}

	shouldRelay(intel: DomainIntel): boolean {
		return intel.registrarAbuseEmail !== null;
	}

	async submitReport(url: string, intel: DomainIntel): Promise<RelaySubmissionResult> {
		if (!intel.registrarAbuseEmail) {
			return { success: false, response: "No abuse email found" };
		}

		this.logger.log(
			`Sending abuse report for ${maskUrl(url)} to ${intel.registrar} (${intel.registrarAbuseEmail})`,
		);

		const { subject, text, html } = buildAbuseEmail(url, intel);

		const messageId = await this.abuseMail.send({
			to: intel.registrarAbuseEmail,
			subject,
			text,
			html,
		});

		return {
			success: true,
			response: {
				messageId,
				registrar: intel.registrar,
				abuseEmail: intel.registrarAbuseEmail,
			},
		};
	}
}
