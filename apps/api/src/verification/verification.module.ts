import { Module, forwardRef } from "@nestjs/common";
import { VerificationService } from "./verification.service.js";
import { VerificationProcessor } from "./verification.processor.js";
import { AllowlistService } from "./allowlist.service.js";
import { RelayModule } from "../relay/relay.module.js";

@Module({
	imports: [forwardRef(() => RelayModule)],
	providers: [VerificationService, VerificationProcessor, AllowlistService],
	exports: [VerificationService],
})
export class VerificationModule {}
