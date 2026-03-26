import { initTRPC } from "@trpc/server"
import type { TRPCContext } from "./context.js"

const t = initTRPC.context<TRPCContext>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware
