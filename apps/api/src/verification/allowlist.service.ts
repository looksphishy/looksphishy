import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

@Injectable()
export class AllowlistService implements OnModuleInit {
	private readonly logger = new Logger(AllowlistService.name);
	private readonly domains = new Set<string>();

	async onModuleInit() {
		const filePath = join(import.meta.dirname, "../data/tranco-top-25k.csv");
		const contents = await readFile(filePath, "utf-8");

		for (const line of contents.split("\n")) {
			const domain = line.trim();
			if (domain) this.domains.add(domain);
		}

		this.logger.log(`Loaded ${this.domains.size} domains into allowlist`);
	}

	isAllowlisted(url: string): boolean {
		try {
			const hostname = new URL(url).hostname.toLowerCase();
			return this.matchesDomain(hostname);
		} catch {
			return false;
		}
	}

	/**
	 * Checks the hostname and all parent domains against the allowlist.
	 * e.g. "login.accounts.google.com" checks:
	 *   - login.accounts.google.com
	 *   - accounts.google.com
	 *   - google.com
	 */
	private matchesDomain(hostname: string): boolean {
		const parts = hostname.split(".");

		for (let i = 0; i < parts.length - 1; i++) {
			const candidate = parts.slice(i).join(".");
			if (this.domains.has(candidate)) return true;
		}

		return false;
	}
}
