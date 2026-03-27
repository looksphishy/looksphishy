import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RelayService } from "./relay.service.js";
import { RelayProcessor } from "./relay.processor.js";
import { GoogleProvider } from "./providers/google.provider.js";
import { CloudflareProvider } from "./providers/cloudflare.provider.js";
import { ApwgProvider } from "./providers/apwg.provider.js";
import { PhishtankProvider } from "./providers/phishtank.provider.js";
import { RegistrarProvider } from "./providers/registrar.provider.js";

@Module({
	imports: [BullModule.registerQueue({ name: "relay" })],
	providers: [
		RelayService,
		RelayProcessor,
		GoogleProvider,
		CloudflareProvider,
		ApwgProvider,
		PhishtankProvider,
		RegistrarProvider,
	],
	exports: [RelayService],
})
export class RelayModule {}
