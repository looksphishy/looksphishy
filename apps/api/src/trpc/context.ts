import type { INestApplication } from "@nestjs/common";
import type { Request, Response } from "express";
import { ReportService } from "../report/report.service.js";

export interface TRPCContext {
	req: Request;
	res: Response;
	reportService: ReportService;
}

export function createContext(
	app: INestApplication,
	req: Request,
	res: Response,
): TRPCContext {
	return {
		req,
		res,
		reportService: app.get(ReportService),
	};
}
