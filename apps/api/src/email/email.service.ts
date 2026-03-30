import { Injectable, Logger } from "@nestjs/common";
import { Plunk } from "@plunk/node/dist/lib/Plunk.js";
import { env } from "../config/env.js";

export interface SendEmailOptions {
	to: string;
	subject: string;
	body: string;
}

@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name);
	private readonly plunk: Plunk;

	constructor() {
		this.plunk = new Plunk(env().PLUNK_API_KEY);
	}

	async send(options: SendEmailOptions): Promise<void> {
		await this.plunk.emails.send({
			to: options.to,
			subject: options.subject,
			body: options.body,
		});

		this.logger.log(`Email sent to ${options.to}`);
	}
}
