import { z } from "zod";
import { REPORT_STATUSES } from "../constants.js";

export const reportInputSchema = z.object({
	url: z.string().url(),
	email: z.string().email().optional(),
	turnstileToken: z.string().min(1),
});

export type ReportInput = z.infer<typeof reportInputSchema>;

export const reportStatusSchema = z.enum(REPORT_STATUSES);

export const reportOutputSchema = z.object({
	id: z.string().uuid(),
	status: reportStatusSchema,
	createdAt: z.string().datetime(),
});

export type ReportOutput = z.infer<typeof reportOutputSchema>;

export const getReportInputSchema = z.object({
	id: z.string().uuid(),
});

export const getReportOutputSchema = reportOutputSchema.extend({
	relayResults: z.array(
		z.object({
			provider: z.string(),
			status: z.string(),
			attemptedAt: z.string().datetime().nullable(),
		}),
	),
});

export type GetReportOutput = z.infer<typeof getReportOutputSchema>;
