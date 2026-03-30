import { Injectable, Inject, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE } from "../database/database.module.js";
import * as schema from "../database/schema.js";
import { EmailService } from "./email.service.js";

@Injectable()
export class NotificationService {
	private readonly logger = new Logger(NotificationService.name);
	private readonly notified = new Set<string>();

	constructor(
		@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
		private email: EmailService,
	) {}

	@OnEvent("report.submitted")
	async onReportSubmitted(reportId: string) {
		const report = await this.getReport(reportId);
		if (!report?.reporterEmail) return;

		const statusUrl = `https://looksphishy.org/report/${report.id}`;

		await this.email.send({
			to: report.reporterEmail,
			subject: `Report received — ${this.domain(report.url)}`,
			body: `
				<h2>We got your report</h2>
				<p>Thanks for reporting a suspicious URL. We're on it.</p>
				<table style="width:100%;border-collapse:collapse;margin:16px 0">
					<tr>
						<td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600">URL</td>
						<td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;word-break:break-all;font-family:monospace;font-size:13px">${this.escapeHtml(report.url)}</td>
					</tr>
				</table>
				<p>We'll verify this URL against our threat intelligence and, if confirmed as phishing, relay it to security providers including Google, Netcraft, Cloudflare, and domain registrars.</p>
				<p><a href="${statusUrl}" style="display:inline-block;padding:10px 20px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Track your report</a></p>
				<p style="font-size:13px;color:#6b7280;margin-top:24px">Report ID: ${report.id}</p>
			`,
		});
	}

	@OnEvent("report.updated")
	async onReportUpdated(reportId: string) {
		const report = await this.getReport(reportId);
		if (!report?.reporterEmail) return;

		const key = `${reportId}:${report.status}`;
		if (this.notified.has(key)) return;

		if (report.status === "rejected") {
			this.notified.add(key);
			await this.email.send({
				to: report.reporterEmail,
				subject: `Not confirmed as phishing — ${this.domain(report.url)}`,
				body: `
					<h2>Verification result</h2>
					<p>We checked the URL you reported and our verification didn't classify it as a phishing site.</p>
					<table style="width:100%;border-collapse:collapse;margin:16px 0">
						<tr>
							<td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600">URL</td>
							<td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;word-break:break-all;font-family:monospace;font-size:13px">${this.escapeHtml(report.url)}</td>
						</tr>
						<tr>
							<td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600">Result</td>
							<td style="padding:8px 12px;border:1px solid #e5e7eb">Not classified as phishing</td>
						</tr>
					</table>
					<p>This doesn't necessarily mean the site is safe — it may have been taken down already or our analysis may not have detected the threat. If you believe this is incorrect, you can report it again later.</p>
					<p style="font-size:13px;color:#6b7280;margin-top:24px">Thank you for helping make the internet safer.</p>
				`,
			});
		}

		if (report.status === "completed") {
			this.notified.add(key);

			const relays = await this.db.query.relayResults.findMany({
				where: eq(schema.relayResults.reportId, reportId),
			});

			const submitted = relays.filter(
				(r) => r.status === "submitted" || r.status === "accepted",
			);

			const providerNames: Record<string, string> = {
				google: "Google Web Risk",
				netcraft: "Netcraft",
				cloudflare: "Cloudflare",
				registrar: "Domain Registrar",
				hosting: "Hosting Provider",
			};

			const providerList = submitted
				.map((r) => `<li>${this.escapeHtml(providerNames[r.provider] ?? r.provider)}</li>`)
				.join("");

			const statusUrl = `https://looksphishy.org/report/${report.id}`;

			await this.email.send({
				to: report.reporterEmail,
				subject: `Phishing confirmed & reported — ${this.domain(report.url)}`,
				body: `
					<h2>Report complete</h2>
					<p>The URL you reported has been verified as phishing and relayed to ${submitted.length} security provider${submitted.length !== 1 ? "s" : ""}.</p>
					<table style="width:100%;border-collapse:collapse;margin:16px 0">
						<tr>
							<td style="padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;font-weight:600">URL</td>
							<td style="padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;word-break:break-all;font-family:monospace;font-size:13px">${this.escapeHtml(report.url)}</td>
						</tr>
					</table>
					<p style="font-weight:600">Reported to:</p>
					<ul>${providerList}</ul>
					<p><a href="${statusUrl}" style="display:inline-block;padding:10px 20px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View full report</a></p>
					<p style="font-size:13px;color:#6b7280;margin-top:24px">Thank you for helping make the internet safer.</p>
				`,
			});
		}
	}

	private async getReport(reportId: string) {
		return this.db.query.reports.findFirst({
			where: eq(schema.reports.id, reportId),
		});
	}

	private domain(url: string): string {
		try {
			return new URL(url).hostname;
		} catch {
			return "unknown";
		}
	}

	private escapeHtml(str: string): string {
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}
}
