import { createSign } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import type { DomainIntel } from "../../domain-intel/domain-intel.service.js";
import { BaseRelayProvider, type RelaySubmissionResult } from "./base.provider.js";
import { maskUrl } from "../../common/url-safety.js";
import { env } from "../../config/env.js";

const MONTHLY_QUOTA = 100;
const MONITORING_SCOPE = "https://www.googleapis.com/auth/monitoring.read";

function base64url(input: Buffer | string): string {
	const buf = typeof input === "string" ? Buffer.from(input) : input;
	return buf.toString("base64url");
}

@Injectable()
export class GoogleProvider extends BaseRelayProvider {
	readonly name = "google";
	private readonly logger = new Logger(GoogleProvider.name);

	private cachedToken: { token: string; expiresAt: number } | null = null;

	private async getAccessToken(): Promise<string> {
		if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
			return this.cachedToken.token;
		}

		const sa = JSON.parse(env().GOOGLE_SERVICE_ACCOUNT_KEY);
		const now = Math.floor(Date.now() / 1000);

		const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
		const payload = base64url(
			JSON.stringify({
				iss: sa.client_email,
				scope: MONITORING_SCOPE,
				aud: "https://oauth2.googleapis.com/token",
				iat: now,
				exp: now + 3600,
			}),
		);

		const signer = createSign("RSA-SHA256");
		signer.update(`${header}.${payload}`);
		const signature = signer.sign(sa.private_key, "base64url");

		const jwt = `${header}.${payload}.${signature}`;

		const response = await fetch("https://oauth2.googleapis.com/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
				assertion: jwt,
			}),
			signal: AbortSignal.timeout(10_000),
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Google OAuth2 token exchange failed (${response.status}): ${body}`);
		}

		const data = await response.json();
		this.cachedToken = {
			token: data.access_token,
			expiresAt: Date.now() + (data.expires_in - 60) * 1000,
		};

		return data.access_token;
	}

	private async getMonthlySubmissionCount(): Promise<number> {
		const { GOOGLE_CLOUD_PROJECT_ID } = env();
		const accessToken = await this.getAccessToken();

		const startOfMonth = new Date();
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);
		const now = new Date();

		const alignmentPeriod = `${Math.ceil((now.getTime() - startOfMonth.getTime()) / 1000)}s`;

		const filter = [
			`metric.type="serviceruntime.googleapis.com/api/request_count"`,
			`resource.labels.service="webrisk.googleapis.com"`,
		].join(" AND ");

		const params = new URLSearchParams({
			filter,
			"interval.startTime": startOfMonth.toISOString(),
			"interval.endTime": now.toISOString(),
			"aggregation.alignmentPeriod": alignmentPeriod,
			"aggregation.perSeriesAligner": "ALIGN_SUM",
			"aggregation.crossSeriesReducer": "REDUCE_SUM",
		});

		const response = await fetch(
			`https://monitoring.googleapis.com/v3/projects/${GOOGLE_CLOUD_PROJECT_ID}/timeSeries?${params}`,
			{
				headers: { Authorization: `Bearer ${accessToken}` },
				signal: AbortSignal.timeout(10_000),
			},
		);

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Cloud Monitoring returned ${response.status}: ${body}`);
		}

		const data = await response.json();

		if (!data.timeSeries?.length) return 0;

		let total = 0;
		for (const series of data.timeSeries) {
			for (const point of series.points ?? []) {
				total += Number(point.value?.int64Value ?? 0);
			}
		}

		this.logger.log(`Cloud Monitoring reports ${total} Web Risk API calls this month`);
		return total;
	}

	async submitReport(url: string, _intel: DomainIntel): Promise<RelaySubmissionResult> {
		const count = await this.getMonthlySubmissionCount();
		if (count >= MONTHLY_QUOTA) {
			this.logger.warn(
				`Google Web Risk monthly quota reached (${count}/${MONTHLY_QUOTA}), skipping API call for ${maskUrl(url)}`,
			);
			return { success: false, quotaExceeded: true };
		}

		this.logger.log(`Submitting ${maskUrl(url)} to Google Web Risk (${count + 1}/${MONTHLY_QUOTA} this month)`);

		const { GOOGLE_CLOUD_PROJECT_ID, GOOGLE_WEB_RISK_API_KEY } = env();

		const response = await fetch(
			`https://webrisk.googleapis.com/v1/projects/${GOOGLE_CLOUD_PROJECT_ID}/uris:submit`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Goog-Api-Key": GOOGLE_WEB_RISK_API_KEY,
				},
				body: JSON.stringify({
					submission: { uri: url },
					threatInfo: {
						abuseType: "SOCIAL_ENGINEERING",
						threatJustification: {
							labels: ["AUTOMATED_REPORT"],
							comments: "Phishing URL reported and verified by LooksPhishy.org",
						},
						threatConfidence: { level: "HIGH" },
					},
					threatDiscovery: {
						platform: "GENERAL_PLATFORM",
					},
				}),
				signal: AbortSignal.timeout(30_000),
			},
		);

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Google Web Risk returned ${response.status}: ${body}`);
		}

		const result = await response.json();

		this.logger.log(`Google Web Risk submission accepted for ${maskUrl(url)}`);

		return { success: true, response: result };
	}
}
