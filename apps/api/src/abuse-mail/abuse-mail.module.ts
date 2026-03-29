import { Global, Module } from "@nestjs/common";
import { AbuseMailService } from "./abuse-mail.service.js";

@Global()
@Module({
	providers: [AbuseMailService],
	exports: [AbuseMailService],
})
export class AbuseMailModule {}
