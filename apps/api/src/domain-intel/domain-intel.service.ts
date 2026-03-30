import { Injectable, Logger } from "@nestjs/common";
import { resolve as dnsResolve, resolve4 } from "node:dns/promises";
import { maskUrl } from "../common/url-safety.js";

export interface DomainIntel {
	domain: string;
	isCloudflare: boolean;
	registrar: string | null;
	registrarAbuseEmail: string | null;
	hostingProvider: string | null;
	hostingAbuseEmail: string | null;
}

const CACHE_MAX_SIZE = 5000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Simple email format check for RDAP-derived addresses
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidAbuseEmail(email: string | null): email is string {
	if (!email) return false;
	if (!EMAIL_RE.test(email)) return false;
	// Reject obviously internal/bogus addresses
	const domain = email.split("@")[1].toLowerCase();
	if (domain === "localhost" || domain.endsWith(".local") || domain.endsWith(".internal")) {
		return false;
	}
	return true;
}

@Injectable()
export class DomainIntelService {
	private readonly logger = new Logger(DomainIntelService.name);
	private readonly cache = new Map<string, { intel: DomainIntel; expires: number }>();

	async lookup(url: string): Promise<DomainIntel> {
		const domain = new URL(url).hostname;

		const cached = this.cache.get(domain);
		if (cached && cached.expires > Date.now()) return cached.intel;

		if (cached) this.cache.delete(domain);

		this.logger.log(`Looking up domain intel for ${maskUrl(url)}`);

		const [isCloudflare, rdap, hosting] = await Promise.all([
			this.checkCloudflare(domain),
			this.lookupRdap(domain),
			this.lookupHosting(domain),
		]);

		const intel: DomainIntel = {
			domain,
			isCloudflare,
			registrar: rdap.registrar,
			registrarAbuseEmail: isValidAbuseEmail(rdap.abuseEmail) ? rdap.abuseEmail : null,
			hostingProvider: hosting.provider,
			hostingAbuseEmail: isValidAbuseEmail(hosting.abuseEmail) ? hosting.abuseEmail : null,
		};

		// Evict oldest entries if cache is full
		if (this.cache.size >= CACHE_MAX_SIZE) {
			const firstKey = this.cache.keys().next().value!;
			this.cache.delete(firstKey);
		}

		this.cache.set(domain, { intel, expires: Date.now() + CACHE_TTL_MS });
		return intel;
	}

	private async checkCloudflare(domain: string): Promise<boolean> {
		try {
			const nsRecords = await dnsResolve(domain, "NS");
			return nsRecords.some((ns) =>
				ns.toLowerCase().endsWith(".ns.cloudflare.com"),
			);
		} catch {
			return false;
		}
	}

	private async lookupRdap(
		domain: string,
	): Promise<{ registrar: string | null; abuseEmail: string | null }> {
		try {
			// Extract the registrable domain (e.g., "evil.example.com" -> "example.com")
			const parts = domain.split(".");
			const tld = parts.slice(-2).join(".");

			const response = await fetch(
				`https://rdap.org/domain/${tld}`,
				{ signal: AbortSignal.timeout(10_000) },
			);

			if (!response.ok) {
				return { registrar: null, abuseEmail: null };
			}

			const data = (await response.json()) as RdapResponse;

			const registrar = this.extractRegistrar(data);
			const abuseEmail = this.extractAbuseEmail(data);

			return { registrar, abuseEmail };
		} catch {
			this.logger.warn(`RDAP lookup failed for ${domain}`);
			return { registrar: null, abuseEmail: null };
		}
	}

	private extractRegistrar(data: RdapResponse): string | null {
		const registrarEntity = data.entities?.find((e) =>
			e.roles?.includes("registrar"),
		);
		if (!registrarEntity) return null;

		return (
			registrarEntity.vcardArray?.[1]?.find(
				(v) => v[0] === "fn",
			)?.[3] as string ?? null
		);
	}

	private extractAbuseEmail(data: RdapResponse): string | null {
		for (const entity of data.entities ?? []) {
			// Check the entity itself
			const email = this.extractEmailFromVcard(entity);
			if (email) return email;

			// Check nested entities (registrar often has an "abuse" sub-entity)
			for (const sub of entity.entities ?? []) {
				if (sub.roles?.includes("abuse")) {
					const abuseEmail = this.extractEmailFromVcard(sub);
					if (abuseEmail) return abuseEmail;
				}
			}
		}
		return null;
	}

	private async lookupHosting(
		domain: string,
	): Promise<{ provider: string | null; abuseEmail: string | null }> {
		try {
			const ips = await resolve4(domain);
			if (ips.length === 0) {
				return { provider: null, abuseEmail: null };
			}

			const ip = ips[0];
			const response = await fetch(
				`https://rdap.org/ip/${ip}`,
				{ signal: AbortSignal.timeout(10_000) },
			);

			if (!response.ok) {
				return { provider: null, abuseEmail: null };
			}

			const data = (await response.json()) as IpRdapResponse;

			const provider = data.name ?? null;
			const abuseEmail = this.extractAbuseEmailFromIp(data);

			return { provider, abuseEmail };
		} catch {
			this.logger.warn(`Hosting lookup failed for ${domain}`);
			return { provider: null, abuseEmail: null };
		}
	}

	private extractAbuseEmailFromIp(data: IpRdapResponse): string | null {
		for (const entity of data.entities ?? []) {
			if (entity.roles?.includes("abuse")) {
				const email = this.extractEmailFromVcard(entity);
				if (email) return email;
			}

			for (const sub of entity.entities ?? []) {
				if (sub.roles?.includes("abuse")) {
					const email = this.extractEmailFromVcard(sub);
					if (email) return email;
				}
			}
		}
		return null;
	}

	private extractEmailFromVcard(entity: RdapEntity): string | null {
		const vcard = entity.vcardArray?.[1];
		if (!vcard) return null;

		const emailEntry = vcard.find((v) => v[0] === "email");
		return (emailEntry?.[3] as string) ?? null;
	}
}

interface RdapEntity {
	roles?: string[];
	vcardArray?: [string, Array<[string, unknown, string, unknown]>];
	entities?: RdapEntity[];
}

interface RdapResponse {
	entities?: RdapEntity[];
}

interface IpRdapResponse {
	name?: string;
	entities?: RdapEntity[];
}
