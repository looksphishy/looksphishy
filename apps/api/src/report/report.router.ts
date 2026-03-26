import { router, publicProcedure } from "../trpc/trpc.js";
import { reportInputSchema, getReportInputSchema } from "@looksphishy/shared";

export const reportRouter = router({
	submit: publicProcedure
		.input(reportInputSchema)
		.mutation(async ({ input, ctx }) => {
			return ctx.reportService.submitReport(input);
		}),

	getStatus: publicProcedure
		.input(getReportInputSchema)
		.query(async ({ input, ctx }) => {
			return ctx.reportService.getReportStatus(input.id);
		}),
});
