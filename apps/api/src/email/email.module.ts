import { Global, Module } from "@nestjs/common";
import { EmailService } from "./email.service.js";
import { NotificationService } from "./notification.service.js";

@Global()
@Module({
	providers: [EmailService, NotificationService],
	exports: [EmailService],
})
export class EmailModule {}
