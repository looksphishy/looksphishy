import { Module, Global } from "@nestjs/common"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema.js"

export const DRIZZLE = Symbol("DRIZZLE")

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        const sql = postgres(process.env.DATABASE_URL!)
        return drizzle(sql, { schema })
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
