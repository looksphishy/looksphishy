import { Controller, Get, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Redis } from "ioredis";
import { DRIZZLE } from "../database/database.module.js";
import * as schema from "../database/schema.js";
import { env } from "../config/env.js";

interface ServiceStatus {
	status: "ok" | "error";
	latencyMs?: number;
	error?: string;
}

@Controller("health")
export class HealthController {
	private readonly redis: Redis;

	constructor(
		@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
	) {
		this.redis = new Redis(env().REDIS_URL, { lazyConnect: true });
	}

	@Get()
	async check() {
		const [postgres, redis] = await Promise.all([
			this.checkPostgres(),
			this.checkRedis(),
		]);

		const allOk = postgres.status === "ok" && redis.status === "ok";

		return {
			status: allOk ? "ok" : "degraded",
			services: { postgres, redis },
		};
	}

	private async checkPostgres(): Promise<ServiceStatus> {
		const start = Date.now();
		try {
			await this.db.execute(sql`SELECT 1`);
			return { status: "ok", latencyMs: Date.now() - start };
		} catch (err) {
			return {
				status: "error",
				latencyMs: Date.now() - start,
				error: err instanceof Error ? err.message : "Unknown error",
			};
		}
	}

	private async checkRedis(): Promise<ServiceStatus> {
		const start = Date.now();
		try {
			await this.redis.ping();
			return { status: "ok", latencyMs: Date.now() - start };
		} catch (err) {
			return {
				status: "error",
				latencyMs: Date.now() - start,
				error: err instanceof Error ? err.message : "Unknown error",
			};
		}
	}
}
