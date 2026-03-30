import { Controller, Get, Param, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Response } from "express";
import { ReportService } from "./report.service.js";

@Controller("api/reports")
@SkipThrottle()
export class ReportController {
	constructor(
		private readonly reportService: ReportService,
		private readonly events: EventEmitter2,
	) {}

	@Get(":id/stream")
	async stream(@Param("id") id: string, @Res() res: Response) {
		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.flushHeaders();

		const TERMINAL_STATUSES = new Set(["completed", "rejected"]);
		let closed = false;

		const sendStatus = async () => {
			if (closed) return;
			try {
				const status = await this.reportService.getReportStatus(id);
				if (closed) return;

				res.write(`data: ${JSON.stringify(status)}\n\n`);

				if (TERMINAL_STATUSES.has(status.status)) {
					cleanup();
					res.end();
				}
			} catch {
				if (!closed) {
					res.write(`data: ${JSON.stringify({ error: "Report not found" })}\n\n`);
					cleanup();
					res.end();
				}
			}
		};

		const listener = (reportId: string) => {
			if (reportId === id) sendStatus();
		};

		this.events.on("report.updated", listener);

		const timeout = setTimeout(() => {
			cleanup();
			res.end();
		}, 5 * 60 * 1000);

		const cleanup = () => {
			closed = true;
			this.events.off("report.updated", listener);
			clearTimeout(timeout);
		};

		res.on("close", cleanup);

		// Send initial state immediately
		sendStatus();
	}
}
