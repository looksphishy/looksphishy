import { router } from "./trpc.js"
import { reportRouter } from "../report/report.router.js"

export const appRouter = router({
  report: reportRouter,
})

export type AppRouter = typeof appRouter
