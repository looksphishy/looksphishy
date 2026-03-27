import type { DomainIntel } from "../../domain-intel/domain-intel.service.js";

export interface RelaySubmissionResult {
	success: boolean;
	response?: unknown;
}

export abstract class BaseRelayProvider {
	abstract readonly name: string;

	/** Return false to skip this provider for the given domain. Defaults to true. */
	shouldRelay(_intel: DomainIntel): boolean {
		return true;
	}

	abstract submitReport(
		url: string,
		intel: DomainIntel,
	): Promise<RelaySubmissionResult>;
}
