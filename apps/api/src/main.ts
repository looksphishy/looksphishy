import { config } from "dotenv";
import { resolve } from "node:path";

// Load .env — try local first, then monorepo root
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { AppModule } from "./app.module.js";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";
import { validateEnv } from "./config/env.js";

async function bootstrap() {
	const env = validateEnv();

	const app = await NestFactory.create(AppModule);

	app.enableCors({ origin: env.CORS_ORIGIN });

	const expressApp = app.getHttpAdapter().getInstance();

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
