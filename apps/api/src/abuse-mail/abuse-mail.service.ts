import { Injectable, Logger } from "@nestjs/common";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { env } from "../config/env.js";

export interface AbuseMailOptions {
	to: string;
	subject: string;
	text: string;
	html: string;
}

@Injectable()
export class AbuseMailService {
	private readonly logger = new Logger(AbuseMailService.name);
	private readonly client: SESv2Client;
	private readonly fromAddress: string;

	constructor() {
		const config = env();

		this.fromAddress = config.SES_FROM_ADDRESS;
		this.client = new SESv2Client({
			region: config.AWS_REGION,
			credentials: {
				accessKeyId: config.AWS_ACCESS_KEY_ID,
				secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
			},
		});
	}

	async send(options: AbuseMailOptions): Promise<string | undefined> {
		const command = new SendEmailCommand({
			FromEmailAddress: this.fromAddress,
			Destination: {
				ToAddresses: [options.to],
			},
			Content: {
				Simple: {
					Subject: { Data: options.subject },
					Body: {
						Text: { Data: options.text },
						Html: { Data: options.html },
					},
				},
			},
		});

		const result = await this.client.send(command);

		this.logger.log(`Abuse report sent to ${options.to} (messageId: ${result.MessageId})`);

		return result.MessageId;
	}
}
