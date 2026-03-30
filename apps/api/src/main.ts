import { config } from "dotenv";
import { resolve } from "node:path";

// Load .env — try local first, then monorepo root
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { Redis } from "ioredis";
import { AppModule } from "./app.module.js";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";
import { validateEnv } from "./config/env.js";

async function bootstrap() {
	const env = validateEnv();

	const app = await NestFactory.create(AppModule);

	app.enableCors({ origin: env.CORS_ORIGIN });

	const expressApp = app.getHttpAdapter().getInstance();
	expressApp.set("trust proxy", 1);

	const redisClient = new Redis(env.REDIS_URL);

	const trpcLimiter = rateLimit({
		windowMs: 60_000,
		limit: 20,
		standardHeaders: "draft-7",
		legacyHeaders: false,
		message: { error: "Too many requests, please try again later" },
		store: new RedisStore({
			sendCommand: (...args: string[]) =>
				redisClient.call(...(args as [string, ...string[]])) as never,
		}),
	});

	expressApp.use("/trpc", trpcLimiter);

	expressApp.use(
		"/trpc",
		createExpressMiddleware({
			router: appRouter,
			createContext: ({ req, res }) => createContext(app, req, res),
		}),
	);

	await app.listen(env.PORT);
	console.log(`API running on http://localhost:${env.PORT}`);
}

bootstrap();
